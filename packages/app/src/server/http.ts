import path from 'path'
import express, { Express, NextFunction, Request, Response, Router } from 'express'
import session from 'express-session'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import passport from 'passport'
import { Strategy as SamlStrategy, Profile, VerifiedCallback } from '@node-saml/passport-saml'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { AcnMessage, AcnOkMessage, AcnRoomsMessage, ErrorMessage, isAcnMessage, } from '@/common/Message'
import { getLogger } from '@/common/Logger'
import { Configuration } from './Configuration'
import { sign, verify } from './jwt'
import { JwtPayload, TokenExpiredError } from 'jsonwebtoken'
import { openZipFile, SoundFileDefinition } from '@/sound/file'

const COOKIE_NAME_ID = 'nid'

const log = getLogger('http')

async function verifyToken(headers: Request['headers'], c: Configuration): Promise<JwtPayload | null> {
  const azn = headers.authorization
  if (!azn) {
    return Promise.reject(new Error('No authorization header'))
  }
  const r = /Bearer +(.*)/.exec(azn)
  if (!r || r.length === 1) {
    return Promise.reject(new Error('Failed to parse authorization header'))
  }
  const token = r[1]
  return verify(token, c.jwtPublicKey)
    .catch((reason: unknown): null => {
      if (reason) {
        if (reason instanceof TokenExpiredError) {
          return null
        }
        throw reason
      }
      throw new Error('Token has no payload')
    })
}

function login(
  req: Request<unknown, AcnMessage>,
  res: Response<AcnOkMessage | ErrorMessage>,
  configuration: Configuration
): void {
  const acn = req.body
  if (!isAcnMessage(acn)) {
    log.debug('[login]', req.body)
    const err: ErrorMessage = {
      type: 'error',
      error: 'ACN_FAILED',
      message: 'Unexpected message.'
    }
    res.status(401).json(err)
    return
  }
  for (const r of configuration.rooms) {
    if (r.room === acn.room && r.hash === acn.hash) {
      log.debug('[authenticate] Room:', acn.room)
      // TODO Add ip:port:time hash to payload
      sign({ room: acn.room }, configuration.jwtPrivateKey, acn.longLife)
        .then((token: string): void => {
          log.info('[login]', token)
          const ok: AcnOkMessage = {
            type: 'acn',
            attrs: { token },
          }
          res.status(200).json(ok)
        })
        .catch ((reason: unknown): void => {
          log.error(reason)
          const error: ErrorMessage = {
            type: 'error',
            error: 'ACN_FAILED',
            message: String(reason)
          }
          res.status(500).json(error)
        })
      return
    }
  }
  log.debug('No room or invalid hash:', acn)
  const error: ErrorMessage = {
    type: 'error',
    error: 'ACN_FAILED',
    message: 'Invalid room or hash.'
  }
  res.status(401).json(error)
}

function rooms(req: Request, res: Response, configuration: Configuration): void {
  if (!req.isAuthenticated()) {
    const error: ErrorMessage = {
      type: 'error',
      error: 'ACN_FAILED',
      message: 'SAML login required.'
    }
    res.status(401).json(error)
    return
  }

  // TODO Select rooms for nid
  const message: AcnRoomsMessage = {
    type: 'acn',
    nid: req.cookies[COOKIE_NAME_ID], // TODO req.user ?
    rooms: configuration.rooms,
  }
  res.status(200).json(message)
}

function logout(req: Request, res: Response, c: Configuration): void {
  if (c.saml) {
    req.logOut({}, () => undefined)
  }
  res.status(200).json({})
}

function getFilePath(res: Response, c: Configuration, ext: string): string {
  return path.join(c.soundDirPath, res.locals.jwtPayload.room) + '.' + ext
}

async function ensureFile(res: Response, c: Configuration, ext: string): Promise<string | null> {
  log.debug('[ensureFile]', c.soundDirPath, res.locals.jwtPayload.room, ext)
  if (!c.soundDirPath) {
    return null
  }
  const filePath = getFilePath(res, c, ext)
  try {
    const s = await fsp.stat(filePath)
    if (!s.isFile()) {
      return null
    }
  } catch (e: unknown) {
    return null
  }
  return filePath
}

async function sendSoundFile(res: Response, c: Configuration): Promise<void> {
  const filePath = await ensureFile(res, c, 'zip')
  if (!filePath) {
    res.status(404).json({})
    return
  }

  const room = res.locals.jwtPayload.room
  log.debug('Load sound zip file for ' + room)
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', `attachment; filename="${room}-sounds.zip"`)
  fs.createReadStream(filePath).pipe(res)
}

async function recvSoundFile(req: Request, res: Response, c: Configuration): Promise<void> {
  const validationResult = validateSoundFile(req)
  if (validationResult) {
    res.status(validationResult.status).json(validationResult.error)
    return
  }

  try {
    const zipPath = getFilePath(res, c, 'zip')
    const md5Path = getFilePath(res, c, 'md5')
    const room = res.locals.jwtPayload.room
    await saveSoundFile(zipPath, md5Path, req.body, room, c.soundDirPath)
    res.status(200).json({})
  } catch (e: unknown) {
    const detail = (typeof e === 'string') ? e :
      (e instanceof Error) ? e.toString() : 'Unexpected error'
    const msg: ErrorMessage = {
      type: 'error',
      error: 'ERROR',
      message: detail,
    }
    res.status(500).json(msg)
  }
}

function validateSoundFile(req: Request): {
  status: number
  error: ErrorMessage
} | null {
  if (!(req.body instanceof Buffer)) {
    log.debug('[validateSoundFile]', req.body)
    return {
      status: 400,
      error:{
        type: 'error',
        error: 'UNEXPECTED_FORMAT',
        message: 'Unexpected message.'
      }
    }
  }

  // TODO Worker
  try {
    const errors: string[] = []
    openZipFile(
      Uint8Array.from(req.body),
      () => { return },
      (fileName: string) => {
        errors.push(`"${fileName}" is not defined in the manifest.`)
      },
      (unused: SoundFileDefinition[]) => {
        const fileNamesCsv = unused.map(e => e.file).join(', ')
        errors.push(`No sound file found for "${fileNamesCsv}".`)
      }
    )
    if (errors.length > 0) {
      const body: ErrorMessage = {
        type: 'error',
        error: 'UNEXPECTED_FORMAT',
        message: JSON.stringify(errors),
      }
      return {
        status: 400,
        error: body,
      }
    }
  } catch (e: unknown) {
    const message = (typeof e === 'string') ? e :
      (e instanceof Error) ? e.toString() : 'Unexpected error'
    const body: ErrorMessage = {
      type: 'error',
      error: 'UNEXPECTED_FORMAT',
      message,
    }
    return {
      status: 400,
      error: body,
    }
  }

  return null
}

// Export for unit test.
export async function saveSoundFile(
  zipPath: string,
  md5Path: string,
  zipBuffer: Buffer,
  room: string,
  soundDirPath: string
): Promise<void> {
  const chekcksum = createHash('md5').update(zipBuffer).digest('hex')
  const tmpMd5Path = `${md5Path}.tmp`
  await fsp.writeFile(tmpMd5Path, chekcksum)
  const tmpZipPath = `${zipPath}.tmp`
  await fsp.writeFile(tmpZipPath, zipBuffer)

  // Create the last backup file.
  const zipStat = await fsp.stat(zipPath).catch(() => null)
  if (zipStat !== null) {
    const timeStr = zipStat.mtime.toISOString().substring(0, 23).replace(/[-:.]/g, '').replace('T', '-')
    await fsp.copyFile(zipPath, `${zipPath}.${timeStr}`)
    const md5Stat = await fsp.stat(md5Path).catch(() => null)
    if (md5Stat !== null) {
      // Use zip mtime as the md5 mtime.
      await fsp.copyFile(md5Path, `${md5Path}.${timeStr}`)
    }
  }

  // Delete old backup files.
  const dirents = await fsp.readdir(soundDirPath, {withFileTypes: true})
  const zipFile = `${room}.zip`
  const zipBackups = dirents
    .filter(d => d.isFile() && d.name.startsWith(`${zipFile}.`) && !d.name.endsWith('.tmp'))
    .sort((a, b) => a.name.localeCompare(b.name))
  const deleteCount = zipBackups.length - 3 // Keep 3 old files.
  for (let i = 0; i < deleteCount; i++) {
    const zipPathToRm = zipBackups[i].name
    const md5PathToRm = zipPathToRm.replace('.zip', '.md5')
    await fsp.unlink(path.join(soundDirPath, zipPathToRm))
    await fsp.unlink(path.join(soundDirPath, md5PathToRm))
  }

  await fsp.rename(tmpZipPath, zipPath)
  await fsp.rename(tmpMd5Path, md5Path)
}

async function sendSoundFileChecksum(res: Response, c: Configuration): Promise<void> {
  log.debug('[sendSoundFileChecksum]')
  const filePath = await ensureFile(res, c, 'md5')
  if (!filePath) {
    res.status(404).json({})
    return
  }

  log.debug('checksum.')
  fs.createReadStream(filePath).pipe(res)
}

function createRouter(configuration: Configuration, samlStrategy: SamlStrategy | undefined): Router {
  const router = express.Router()
  const acnAznMiddleware = acnAznMiddlewareBase.bind(null, configuration)
  const corsMiddleware = cors({
    origin: configuration.corsOrigins
  })
  const corsMiddlewareAllowCredentials = cors({
    origin: configuration.corsOrigins,
    credentials: true,
  })

  const loginPath = '/login'
  router.options(loginPath, corsMiddleware)
  router.post(loginPath, corsMiddleware, function(req: Request, res: Response): void {
    login(req, res, configuration)
  })
  const logoutPath = '/logout'
  router.options(logoutPath, corsMiddleware)
  router.get(logoutPath, corsMiddleware, function(req: Request, res: Response): void {
    logout(req, res, configuration)
  })
  const soundFilePath = '/sound/file'
  router.options(soundFilePath, corsMiddleware)
  router.get(soundFilePath, acnAznMiddleware, corsMiddleware, function(req: Request, res: Response): Promise<void> {
    return sendSoundFile(res, configuration)
  })
  router.post(soundFilePath, acnAznMiddleware, corsMiddleware, function(req: Request, res: Response): Promise<void> {
    return recvSoundFile(req, res, configuration)
  })
  const soundChecksumPath = '/sound/checksum'
  router.options(soundChecksumPath, corsMiddleware)
  router.get(soundChecksumPath, acnAznMiddleware, corsMiddleware, function(req: Request, res: Response): Promise<void> {
    return sendSoundFileChecksum(res, configuration)
  })
  if (configuration.saml) {
    const redirects = {
      successRedirect: `${configuration.saml.appUrl}/rooms`,
      failureRedirect: `${configuration.saml.appUrl}/login`,
    }
    router.get('/saml/login', passport.authenticate('saml', redirects))
    router.post(
      '/saml/acs',
      bodyParser.urlencoded({ extended: false }),
      passport.authenticate('saml', { failureRedirect: redirects.failureRedirect }),
      function(_: Request, res: Response): void {
        res.redirect(redirects.successRedirect)
      }
    )
    const roomsPath = '/rooms'
    router.options(roomsPath, corsMiddlewareAllowCredentials)
    router.get(roomsPath, corsMiddlewareAllowCredentials, function(req: Request, res: Response): void {
      rooms(req, res, configuration)
    })
    if (samlStrategy) {
      const samlMetadataPath = '/saml/metadata'
      router.options(samlMetadataPath, corsMiddleware)
      router.head(samlMetadataPath, corsMiddleware, function (_: Request, res: Response) {
        res.status(200).end()
      })
      router.get(samlMetadataPath, corsMiddleware, function (_: Request, res: Response) {
        if (!configuration.saml) {
          res.status(404).json({}) // This should not happen.
          return
        }
        const metadata = samlStrategy.generateServiceProviderMetadata(
          configuration.saml.decryptionCert || null, configuration.saml.signingCert
        )
        res.status(200).type('application/xml').send(metadata)
      })
    }
  }

  return router
}

async function acnAznMiddlewareBase(c: Configuration, req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jwtPayload = await verifyToken(req.headers, c)
    if (jwtPayload === null){
      const error: ErrorMessage = {
        type: 'error',
        error: 'ACN_FAILED',
        message: 'Token expired'
      }
      res.status(403).json(error)
      return
    }
    if (!jwtPayload.room) {
      const error: ErrorMessage = {
        type: 'error',
        error: 'ACN_FAILED',
        message: 'No room'
      }
      res.status(401).json(error)
      return
    }
    res.locals.jwtPayload = jwtPayload
  } catch (e: unknown) {
    log.debug(e)
    const error: ErrorMessage = {
      type: 'error',
      error: 'ACN_FAILED',
      message: String(e)
    }
    res.status(401).json(error)
    return
  }
  next()
}

function setupSamlIfRequired(app: Express, configuration: Configuration): SamlStrategy | undefined {
  if (!configuration.saml) {
    return
  }

  log.info('Configure saml settings.')

  passport.serializeUser(function (user: Express.User, done: (err: unknown, id: Express.User) => void) {
    done(null, user)
  })
  passport.deserializeUser(function (user: Express.User, done: (err: unknown, id: Express.User) => void) {
    done(null, user)
  })

  const samlLoginCallback = (req: Request, profile: Profile | null | undefined, done: VerifiedCallback): void => {
    log.info('saml login', profile)
    if (!profile) {
      done(null)
      return
    }
    req.res?.cookie(COOKIE_NAME_ID, profile.nameID, {
      httpOnly: true,
      secure: true,
    })
    done(null, { id: profile.nameID })
  }
  const samlLogoutCallback = (req: Request, profile: Profile | null | undefined, done: VerifiedCallback): void => {
    log.info('saml logout', profile)
    profile ? done(null, { id: profile.nameID }) : done(null)
  }
  // Use MultiSamlStrategy to support multiple IDPs (if I'm multitenant SaaS, for example)
  const samlStrategy = new SamlStrategy(
    {
      ...configuration.saml,
      audience: false,
      passReqToCallback: true,
    },
    samlLoginCallback,
    samlLogoutCallback,
  )

  passport.use(samlStrategy)

  app.use(cookieParser())
  app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: configuration.saml.cookieSecret,
  }))
  app.use(passport.initialize())
  app.use(passport.session())

  return samlStrategy
}

export function createApp(
  configuration: Configuration,
  preHook = (app: Express) => app,
  postHook = (app: Express) => app
): Express {
  const app = preHook(express())

  const samlStrategy = setupSamlIfRequired(app, configuration)

  app.use(express.json())
  // TODO Limit should be configurable
  app.use(express.raw({ limit: '5mb', type: 'application/zip' }))
  app.use(function (_, res, next) {
    res.removeHeader('X-Powered-By')
    res.removeHeader('ETag')
    res.header('Cache-Control', 'private, no-cache, must-revalidate')
    next()
  })
  const router = createRouter(configuration, samlStrategy)
  app.use(router)
  return postHook(app)
}
