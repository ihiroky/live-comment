import express, { Express, NextFunction, Request, Response, Router } from 'express'
import cors from 'cors'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { AcnMessage, AcnOkMessage,  ErrorMessage, getLogger, isAcnMessage, } from 'common'
import { Configuration } from './Configuration'
import { sign, verify } from './jwt'
import { JwtPayload, TokenExpiredError } from 'jsonwebtoken'
import path from 'path'

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

async function logout(_: Request, res: Response): Promise<void> {
  res.status(200).json({})
}

async function ensureFile(res: Response, c: Configuration, ext: string): Promise<string | null> {
  log.debug('[ensureFile]', c.soundDirPath, res.locals.jwtPayload.room, ext)
  if (!c.soundDirPath) {
    return null
  }
  const filePath = path.join(c.soundDirPath, res.locals.jwtPayload.room) + '.' + ext
  try {
    const s = await stat(filePath)
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

  log.debug('Load sound zip file.')
  res.setHeader('Content-Type', 'application/zip')
  res.setHeader('Content-Disposition', 'attachment; filename="sounds.zip"')
  createReadStream(filePath).pipe(res)
}

async function sendSoundFileChecksum(res: Response, c: Configuration): Promise<void> {
  log.debug('[sendSoundFileChecksum]')
  const filePath = await ensureFile(res, c, 'zip.md5')
  if (!filePath) {
    res.status(404).json({})
    return
  }

  log.debug('checksum.')
  createReadStream(filePath).pipe(res)
}

function createRouter(configuration: Configuration): Router {
  const router = express.Router()
  router.post('/login', function(req: Request, res: Response): void {
    login(req, res, configuration)
  })
  router.get('/logout', function(req: Request, res: Response): void {
    logout(req, res)
  })
  router.get('/sound/file', function(req: Request, res: Response): void {
    log.debug('GET /sound/file')
    sendSoundFile(res, configuration)
  })
  router.get('/sound/checksum', function(req: Request, res: Response): void {
    log.debug('GET /sound/checksum')
    sendSoundFileChecksum(res, configuration)
  })
  return router
}

async function acnAznMiddlewareBase(c: Configuration, req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.url !== '/login') {
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
  }
  next()
}

export function createApp(configuration: Configuration): Express {
  const app = express()
  const acnAznMiddleware = acnAznMiddlewareBase.bind(null, configuration)
  const corsMiddleware = cors({
    origin: [/http:\/\/\w+\.live-comment.ga$/, 'http://localhost:18080']
  })

  app.use(express.json())
  app.use(corsMiddleware)
  app.use(acnAznMiddleware)
  const router = createRouter(configuration)
  app.options('*', corsMiddleware) // include before other routes
  app.use(router)
  return app
}
