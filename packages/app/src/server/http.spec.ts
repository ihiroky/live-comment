/**
 * @jest-environment node
 */
import { AcnMessage, ErrorMessage, isAcnOkMessage } from '@/common/Message'
import { assertNotNullable } from '@/common/assert'
import { LogLevels } from '@/common/Logger'
import { createHash } from '@/common/utils'
import request from 'supertest'
import { Argv } from './argv'
import { Configuration, loadConfigAsync, ServerConfig, SamlConfig } from './Configuration'
import { createApp, saveSoundFile } from './http'
import { sign } from 'jsonwebtoken'
import crypto from 'node:crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { test, expect, beforeEach, afterEach } from '@jest/globals'

let simpleContext: Awaited<ReturnType<typeof prepareApp>>
let configJsonSaml: ActualConfig
let samlContext: Awaited<ReturnType<typeof prepareApp>> | undefined

type ActualConfig = Omit<ServerConfig, 'jwtPrivateKey' | 'jwtPublicKey' | 'saml'> | {
  saml: Omit<SamlConfig, 'certs' | 'decryption' | 'signing'> | {
    decryption: Omit<SamlConfig['decryption'], 'key' | 'cert'>
    signing: Omit<SamlConfig['signing'], 'key' | 'certs'>
  }
}

async function prepareApp(c: ActualConfig, soundDirPath: string, makeReqAuthenticated = false) {
  fs.mkdirSync(soundDirPath, { recursive: true })
  const configPath = path.join(os.tmpdir(), `http.spec.json.${crypto.randomInt(0, 99999)}` )
  fs.writeFileSync(configPath, JSON.stringify(c))

  const argv: Argv = {
    configPath,
    port: 8080,
    loglevel: LogLevels.INFO,
  }
  const cache = await loadConfigAsync(argv.configPath, 0)
  assertNotNullable(cache.content, ('cache.content must be defined.'))
  const config = new Configuration(argv, cache.content, cache.stat.mtimeMs)
  const app = makeReqAuthenticated
    ? createApp(
      config,
      (app) => app.use((req, _, next) => {
        // make req.isAuthenticated() return true
        req['user'] = { user: 'hoge' }
        next()
      })
    )
    : createApp(config)

  return { soundDirPath, configPath, config, app }
}

async function prepareSamlApp(makeReqAuthenticated: boolean) {
  samlContext = await prepareApp(configJsonSaml, path.join(os.tmpdir(), 'httpUnitTestSaml'), makeReqAuthenticated)
  return samlContext
}

beforeEach(async () => {
  const soundDirPath = path.join(os.tmpdir(), 'httpUnitTestSimple')
  const configJson: ActualConfig = {
    rooms: [
      {
        room: "test",
        hash: "ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db27ac185f8a0e1d5f84f88bc887fd67b143732c304cc5fa9ad8e6f57f50028a8ff"
      },
    ],
    soundDirPath,
    jwtPrivateKeyPath: `${__dirname}/../../config/DO_NOT_USE-jwt.key.sample`,
    jwtPublicKeyPath:  `${__dirname}/../../config/DO_NOT_USE-jwt.key.pub.sample`,
    corsOrigins: ['http://localhost:8888'],
  }
  simpleContext = await prepareApp(configJson, soundDirPath)

  configJsonSaml = {
    ...configJson,
    saml: {
      appUrl: 'http://localhost:8888',
      cookieSecret: 'hoge',
      callbackUrl: 'http://localhost/saml',
      entryPoint: 'https://example.com/saml',
      issuer: 'https://example.com',
      certPaths: [
        `${__dirname}/../../config/DO_NOT_USE-idp-cert.pem`,
      ],
      decryption: {
        keyPath: `${__dirname}/../../config/DO_NOT_USE-decryption-key.pem`,
        certPath: `${__dirname}/../../config/DO_NOT_USE-decryption-cert.pem`,
      },
      signing: {
        keyPath: `${__dirname}/../../config/DO_NOT_USE-signing-key.pem`,
        certPaths: [
          `${__dirname}/../../config/DO_NOT_USE-signing-cert.pem`,
        ],
      },
    }
  }
})

afterEach(() => {
  const close = (c: Awaited<ReturnType<typeof prepareApp>> | undefined): void => {
    if (c && c.configPath) {
      fs.rmSync(c.configPath)
    }
    if (c && c.soundDirPath) {
      fs.rmSync(c.soundDirPath, { recursive: true })
    }
  }

  close(simpleContext)
  close(samlContext)
  samlContext = undefined
})

describe('login', () => {
  test('Invalid message on login', async () => {
    const res = await request(simpleContext.app)
      .post('/login')
      .send({ hoge: 'hoge' })

    const message: ErrorMessage = {
      type: 'error',
      error: 'ACN_FAILED',
      message: 'Unexpected message.'
    }
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual(message)
  })

  test('Login OK', async () => {
    const acn: AcnMessage = {
      type: 'acn',
      room: 'test',
      hash: createHash('test'),
    }
    const res = await request(simpleContext.app)
      .post('/login')
      .send(acn)

    expect(res.statusCode).toBe(200)
    if (!isAcnOkMessage(res.body)) {
      // eslint-disable-next-line no-console
      console.error(res.body)
      throw new Error('Response is not AcnOkMessage.')
    }
    expect(res.body.type).toBe('acn')
    expect(res.body.attrs.token.length).toBe(190)
    expect(res.get('cache-control')).toBe('private, no-cache, must-revalidate')
    expect(res.get('vary')).toBe('Origin')
    expect(res.get('content-length')).toBe('225')
    expect(res.get('connection')).toBe('close')
    expect(res.get('date')).toBeDefined()
  })

  test('Invalid room', async () => {
    const acn: AcnMessage = {
      type: 'acn',
      room: 'test0',
      hash: createHash('test'),
    }
    const res = await request(simpleContext.app)
      .post('/login')
      .send(acn)

    const error: ErrorMessage = {
      type: 'error',
      error: 'ACN_FAILED',
      message: 'Invalid room or hash.'
    }
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual(error)
  })

  test('options', async () => {
    const res = await request(simpleContext.app)
      .options('/login')
      .send()

    expect(res.statusCode).toBe(204)
    expect(res.get('cache-control')).toBe('private, no-cache, must-revalidate')
    expect(res.get('vary')).toBe('Origin, Access-Control-Request-Headers')
    expect(res.get('access-control-allow-methods')).toBe('GET,HEAD,PUT,PATCH,POST,DELETE')
    expect(res.get('content-length')).toBe('0')
    expect(res.get('connection')).toBe('close')
    expect(res.get('date')).toBeDefined()
  })
})

describe('/sound/file', () => {
  test('No authorization header', async () => {
    const res = await request(simpleContext.app)
      .get('/sound/file')
      .send()

    const error: ErrorMessage = {
      type: 'error',
      error: 'ACN_FAILED',
      message: 'Error: No authorization header',
    }
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual(error)
  })

  test('No bearer', async () => {
    const res = await request(simpleContext.app)
      .get('/sound/file')
      .set('Authorization', 'hoge')
      .send()

    const error: ErrorMessage = {
      type: 'error',
      error: 'ACN_FAILED',
      message: 'Error: Failed to parse authorization header'
    }
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual(error)
  })

  test('No jwt payload', async () => {
    const { config, app } = simpleContext
    const jwt = sign({}, config.jwtPrivateKey, { expiresIn: '0s', algorithm: 'ES256' })
    const res = await request(app)
      .get('/sound/file')
      .set('Authorization', `Bearer ${jwt}`)
      .send()

    const error: ErrorMessage = {
      type: 'error',
      error: 'ACN_FAILED',
      message: 'Token expired'
    }
    expect(res.statusCode).toBe(403)
    expect(res.body).toEqual(error)
  })

  test('Invalid jwt', async () => {
    const ec384Key = `-----BEGIN EC PRIVATE KEY-----
MIGkAgEBBDBwP13IPv6F6gmyCnbcn1guwvDjpryOE+kJC4WgICZl0Zy+uHBInIjZ
eW8+m+l76zOgBwYFK4EEACKhZANiAASNKKEaueDpIzbLBioQemjkQ5VR53gavGvn
khBw71PYdkE5Be63+rEey7CH9/nEaUgdipqUWkbJCqu3TIZ2Kk59dzLarWPP8Pkr
S5nTR/40W8nCmhl3axYknwxhleDjiYU=
-----END EC PRIVATE KEY-----`
    const jwt = sign({}, ec384Key, { expiresIn: '10s', algorithm: 'ES384' })
    const res = await request(simpleContext.app)
      .get('/sound/file')
      .set('Authorization', `Bearer ${jwt}`)
      .send()

    const error: ErrorMessage = {
      type: 'error',
      error: 'ACN_FAILED',
      message: 'JsonWebTokenError: invalid algorithm'
    }
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual(error)
  })

  test('No room', async () => {
    const { config, app } = simpleContext
    const jwt = sign({ /* no room */ }, config.jwtPrivateKey, { expiresIn: '10s', algorithm: 'ES256' })
    const res = await request(app)
      .get('/sound/file')
      .set('Authorization', `Bearer ${jwt}`)
      .send()

    const error: ErrorMessage = {
      type: 'error',
      error: 'ACN_FAILED',
      message: 'No room',
    }
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual(error)
  })

  test('No sound file returns 404', async () => {
    const { config, app } = simpleContext
    const jwt = sign({ room: 'test' }, config.jwtPrivateKey, { expiresIn: '10s', algorithm: 'ES256' })
    const res = await request(app)
      .get('/sound/file')
      .set('Authorization', `Bearer ${jwt}`)
      .send()

    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({})
  })

  test('Get sound file', async () => {
    const { config, app, soundDirPath } = simpleContext
    const room = 'test'
    const jwt = sign({ room }, config.jwtPrivateKey, { expiresIn: '10s', algorithm: 'ES256' })
    const soundFilePath = path.join(soundDirPath, 'test.zip')
    fs.writeFileSync(soundFilePath, 'content')
    const res = await request(app)
      .get('/sound/file')
      .set('Authorization', `Bearer ${jwt}`)
      .send()

    expect(res.statusCode).toBe(200)
    expect(res.text).toBe('content')
    expect(res.get('cache-control')).toBe('private, no-cache, must-revalidate')
    expect(res.get('vary')).toBe('Origin')
    expect(res.get('transfer-encoding')).toBe('chunked')
    expect(res.get('connection')).toBe('close')
    expect(res.get('date')).toBeDefined()
    expect(res.get('content-type')).toBe('application/zip')
    expect(res.get('content-disposition')).toBe(`attachment; filename="${room}-sounds.zip"`)
  })

  test('options', async () => {
    const res = await request(simpleContext.app)
      .options('/sound/file')
      .send()

    expect(res.statusCode).toBe(204)
    expect(res.get('cache-control')).toBe('private, no-cache, must-revalidate')
    expect(res.get('vary')).toBe('Origin, Access-Control-Request-Headers')
    expect(res.get('access-control-allow-methods')).toBe('GET,HEAD,PUT,PATCH,POST,DELETE')
    expect(res.get('content-length')).toBe('0')
    expect(res.get('connection')).toBe('close')
    expect(res.get('date')).toBeDefined()
  })

  test('Post sound file', async () => {
    const { config, soundDirPath, app } = simpleContext
    const room = 'test'
    const jwt = sign({ room }, config.jwtPrivateKey, { expiresIn: '10s', algorithm: 'ES256' })
    const soundFilePath = path.join(soundDirPath, 'test.zip')
    const zipToUpload = fs.readFileSync(path.resolve(__dirname, '../../config/sounds/test.zip'))

    const res = await request(app)
      .post('/sound/file')
      .type('application/zip')
      .set('Authorization', `Bearer ${jwt}`)
      .send(zipToUpload)

    expect(res.statusCode).toBe(200)
    expect(res.text).toBe('{}')
    expect(fs.existsSync(soundFilePath)).toBe(true)
    const actualMd5 = crypto.createHash('md5').update(fs.readFileSync(soundFilePath)).digest('hex')
    const expectedMd5 = crypto.createHash('md5').update(zipToUpload).digest('hex')
    expect(actualMd5).toBe(expectedMd5)
  })

  test('Post no application/zip', async () => {
    const { config, soundDirPath, app } = simpleContext
    const room = 'test'
    const jwt = sign({ room }, config.jwtPrivateKey, { expiresIn: '10s', algorithm: 'ES256' })
    const soundFilePath = path.join(soundDirPath, 'test.zip')

    const res = await request(app)
      .post('/sound/file')
      .set('Authorization', `Bearer ${jwt}`)
      .send(Buffer.from([]))

    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.text)).toEqual({
      type: 'error',
      error: 'UNEXPECTED_FORMAT',
      message: 'Unexpected message.'
    })
    expect(fs.existsSync(soundFilePath)).toBe(false)
  })

  test('Post sound file with out autorization header', async () => {
    const { app } = simpleContext
    const zipToUpload = fs.readFileSync(path.resolve(__dirname, '../../config/sounds/test.zip'))

    const res = await request(app)
      .post('/sound/file')
      .type('application/zip')
      .send(zipToUpload)

    const error: ErrorMessage = {
      type: 'error',
      error: 'ACN_FAILED',
      message: 'Error: No authorization header'
    }
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual(error)
  })

  test('Post zip which contains invalid content', async () => {
    const { config, soundDirPath, app } = simpleContext
    const room = 'test'
    const jwt = sign({ room }, config.jwtPrivateKey, { expiresIn: '10s', algorithm: 'ES256' })
    const soundFilePath = path.join(soundDirPath, 'test.zip')
    const zipToUpload = fs.readFileSync(path.resolve(__dirname, '../../config/sounds/test-invalid.zip'))

    const res = await request(app)
      .post('/sound/file')
      .type('application/zip')
      .set('Authorization', `Bearer ${jwt}`)
      .send(zipToUpload)

    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.text)).toEqual({
      type: 'error',
      error: 'UNEXPECTED_FORMAT',
      message: JSON.stringify([
        '"Quiz-Question02-1.mp3" is not defined in the manifest.',
        'No sound file found for "Quiz-Wrong_Buzzer02-1.mp3".',
      ])
    })
    expect(fs.existsSync(soundFilePath)).toBe(false)
  })

  test('Post zip file is backuped past 3 generations', async () => {
    const { soundDirPath } = simpleContext
    const room = 'test'
    const zipPath = `${soundDirPath}/test.zip`
    const md5Path = `${soundDirPath}/test.md5`
    const zipToUpload = fs.readFileSync(path.resolve(__dirname, '../../config/sounds/test.zip'))

    const assertFiles = (zipFiles: string[], md5Files: string[]) => {
      expect(zipFiles.includes('test.zip')).toBe(true)
      expect(zipFiles.filter(file => file.startsWith('test.zip.')).length).toBe(3)
      expect(zipFiles.length).toBe(4)
      expect(md5Files.includes('test.md5')).toBe(true)
      expect(md5Files.filter(file => file.startsWith('test.md5.')).length).toBe(3)
      expect(md5Files.length).toBe(4)
    }

    // Save latest and 3 backup files.
    for (let i = 0; i < 4; i++) {
      await saveSoundFile(zipPath, md5Path, zipToUpload, room, soundDirPath)
      await new Promise(resolve => setTimeout(resolve, 50)) // Ensure different timestamps.
    }

    const zipFiles = fs.readdirSync(soundDirPath).filter(file => file.includes('.zip'))
    const md5Files = fs.readdirSync(soundDirPath).filter(file => file.includes('.md5'))
    assertFiles(zipFiles, md5Files)

    // Rotate backup files.
    await saveSoundFile(zipPath, md5Path, zipToUpload, room, soundDirPath)

    const zipFilesAfterRotate = fs.readdirSync(soundDirPath).filter(file => file.includes('.zip'))
    const md5FilesAfterRotate = fs.readdirSync(soundDirPath).filter(file => file.includes('.md5'))
    assertFiles(zipFilesAfterRotate, md5FilesAfterRotate)
    expect(zipFilesAfterRotate).not.toEqual(zipFiles)
    expect(md5FilesAfterRotate).not.toEqual(md5Files)
  })
})

describe('/sound/checksum', () => {
  test('No checksum file', async () => {
    const { config, app } = simpleContext
    const jwt = sign({ room: 'test' }, config.jwtPrivateKey, { expiresIn: '10s', algorithm: 'ES256' })
    const res = await request(app)
      .get('/sound/checksum')
      .set('Authorization', `Bearer ${jwt}`)
      .send()

    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({})
  })

  test('Get checksum of sound file', async () => {
    const { config, app, soundDirPath } = simpleContext
    const jwt = sign({ room: 'test' }, config.jwtPrivateKey, { expiresIn: '10s', algorithm: 'ES256' })
    const soundFilePath = path.join(soundDirPath, 'test.md5')
    fs.writeFileSync(soundFilePath, 'content')
    const res = await request(app)
      .get('/sound/checksum')
      .set('Authorization', `Bearer ${jwt}`)
      .send()

    expect(res.statusCode).toBe(200)
    expect(res.text).toBe('content')
    expect(res.get('cache-control')).toBe('private, no-cache, must-revalidate')
    expect(res.get('vary')).toBe('Origin')
    expect(res.get('connection')).toBe('close')
    expect(res.get('date')).toBeDefined()
    expect(res.get('transfer-encoding')).toBe('chunked')
  })

  test('Get checksum of sound file with out autorization header', async () => {
    const { app, soundDirPath } = simpleContext
    const soundFilePath = path.join(soundDirPath, 'test.md5')
    fs.writeFileSync(soundFilePath, 'content')
    const res = await request(app)
      .get('/sound/checksum')
      .send()

    const error: ErrorMessage = {
      type: 'error',
      error: 'ACN_FAILED',
      message: 'Error: No authorization header'
    }
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual(error)
  })

  test('options', async () => {
    const res = await request(simpleContext.app)
      .options('/sound/checksum')
      .send()

    expect(res.statusCode).toBe(204)
    expect(res.get('cache-control')).toBe('private, no-cache, must-revalidate')
    expect(res.get('vary')).toBe('Origin, Access-Control-Request-Headers')
    expect(res.get('access-control-allow-methods')).toBe('GET,HEAD,PUT,PATCH,POST,DELETE')
    expect(res.get('content-length')).toBe('0')
    expect(res.get('connection')).toBe('close')
    expect(res.get('date')).toBeDefined()
  })
})

describe('/rooms', () => {
  test('/rooms returns the list of the rooms', async () => {
    // https://github.com/jaredhanson/passport/blob/0575de90dc0e76c1b8ca9cc676af89bd301aec60/lib/http/request.js#L79
    const { config, app } = await prepareSamlApp(true)
    const nid = 'fuga'
    const res = await request(app)
      .get('/rooms')
      .set('Cookie', `nid=${nid}`)
      .send()

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.text)).toEqual({
      type: 'acn',
      nid,
      rooms: config.rooms,
    })
  })

  test('/rooms return 401 if not authenticated', async () => {
    const { app } = await prepareSamlApp(false)
    const res = await request(app)
      .get('/rooms')
      .send()

    expect(res.statusCode).toBe(401)
    expect(JSON.parse(res.text)).toEqual({
      type: 'error',
      error: 'ACN_FAILED',
      message: 'SAML login required.'
    })
  })

  test('options', async () => {
    const { app } = await prepareSamlApp(false)
    const res = await request(app)
      .options('/rooms')
      .send()

    expect(res.statusCode).toBe(204)
    expect(res.get('cache-control')).toBe('private, no-cache, must-revalidate')
    expect(res.get('vary')).toBe('Origin, Access-Control-Request-Headers')
    expect(res.get('access-control-allow-methods')).toBe('GET,HEAD,PUT,PATCH,POST,DELETE')
    expect(res.get('content-length')).toBe('0')
    expect(res.get('connection')).toBe('close')
    expect(res.get('date')).toBeDefined()
    expect(res.get('set-cookie')).toBeDefined()
  })
})

describe('/logout', () => {
  test('/logout', async () => {
    const { app } = simpleContext
    const res = await request(app)
      .get('/logout')
      .send()

    expect(res.statusCode).toBe(200)
    expect(res.text).toBe('{}')
    expect(res.get('cache-control')).toBe('private, no-cache, must-revalidate')
    expect(res.get('vary')).toBe('Origin')
    expect(res.get('content-type')).toBe('application/json; charset=utf-8')
    expect(res.get('content-length')).toBe('2')
    expect(res.get('connection')).toBe('close')
    expect(res.get('date')).toBeDefined()
    expect(res.get('etag')).toBeDefined() // Should be removed.
  })

  test('/logout with SAML', async () => {
    const { app } = await prepareSamlApp(true)
    const res = await request(app)
      .get('/logout')
      .send()

    expect(res.statusCode).toBe(200)
    expect(res.text).toBe('{}')
  })


  test('options', async () => {
    const { app } = await prepareSamlApp(false)
    const res = await request(app)
      .options('/logout')
      .send()

    expect(res.statusCode).toBe(204)
    expect(res.get('cache-control')).toBe('private, no-cache, must-revalidate')
    expect(res.get('vary')).toBe('Origin, Access-Control-Request-Headers')
    expect(res.get('access-control-allow-methods')).toBe('GET,HEAD,PUT,PATCH,POST,DELETE')
    expect(res.get('content-length')).toBe('0')
    expect(res.get('connection')).toBe('close')
    expect(res.get('date')).toBeDefined()
    expect(res.get('set-cookie')).toBeDefined()
  })
})

describe('/saml/metadata', () => {
  test('get', async () => {
    const { app } = await prepareSamlApp(true)
    const res = await request(app)
      .get('/saml/metadata')
      .send()

    /* eslint-disable */
    const expected = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" entityID="https://example.com" ID="_8126aea222a1f36b37a7c875068860f8e86cdc2f">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol" AuthnRequestsSigned="true" WantAssertionsSigned="true">
    <KeyDescriptor use="signing">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>MIIEMTCCAxmgAwIBAgIUAjjOFqWm54NOzzXrIoL4+D30K5AwDQYJKoZIhvcNAQEL
BQAwgaYxCzAJBgNVBAYTAkpQMRMwEQYDVQQIDApTb21lLVN0YXRlMRIwEAYDVQQH
DAlTb21lLUNpdHkxITAfBgNVBAoMGEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDEQ
MA4GA1UECwwHc2VjdGlvbjEYMBYGA1UEAwwPdGVzdC1zcC1zaWduaW5nMR8wHQYJ
KoZIhvcNAQkBFhB0ZXN0QGV4YW1wbGUuY29tMCAXDTI0MDIxNDAwNDIxNVoYDzIw
NTQwMjA2MDA0MjE1WjCBpjELMAkGA1UEBhMCSlAxEzARBgNVBAgMClNvbWUtU3Rh
dGUxEjAQBgNVBAcMCVNvbWUtQ2l0eTEhMB8GA1UECgwYSW50ZXJuZXQgV2lkZ2l0
cyBQdHkgTHRkMRAwDgYDVQQLDAdzZWN0aW9uMRgwFgYDVQQDDA90ZXN0LXNwLXNp
Z25pbmcxHzAdBgkqhkiG9w0BCQEWEHRlc3RAZXhhbXBsZS5jb20wggEiMA0GCSqG
SIb3DQEBAQUAA4IBDwAwggEKAoIBAQClgUYK/yLoi36qUcB03o1ilozO0VlGuS17
jMoNlt8CTcUY/rt9RXuF5f3RsGFZcZmjzpvbDUcum/5sU9ZIKJL1lR0TDdVIZsMP
CnA/smPlugFYzYoVLnLG1kf+J7ZSLE+wpiSS8aoK45BcZBrvYvcUilf7I1ze4xBU
atofM2UgeVtJzKd6Pwghn7KgTJlRJHKVbwG1j1WddmoaRp4W1HaLkS914+dzgpoz
5OnHfRNuOHq7S2toqzktVBTnzF5tnWNSM90F+IxgBaBwxZPuoCiCfCM9WmBhVfV6
rSCSqxBIpm+KKO1+Z0ZyfOh8ajPjceh33nwd8NRkRKZjD/niCpxlAgMBAAGjUzBR
MB0GA1UdDgQWBBTz3wbC3poi37vbHRZeJQ7H2KoWBDAfBgNVHSMEGDAWgBTz3wbC
3poi37vbHRZeJQ7H2KoWBDAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUA
A4IBAQCe2+FJzToVBLMWI0FyU9p3hLtSPDeLkI28zeHaLTG+4RhEtnnA86dOmxA/
eQ8JA8hnyTCT0+Iu4RlmXY6OAtilkTtQXEd/qca8gXBPxri4mMK0L6HpdD5jfeI2
5cGj3obEl19yzlK563qRj/vgDVqtmtp5l3DT7Bx/Wx0UvGjTBEO94dEcQJ9Y2uyz
DvA3hVsM99sERGGupIUvIepM9rjdzWc/PoKtmEDIykh2ACWVdssYBVsGZEupL1Gh
VNVQ490BvJ787xnotz5ov1K96Ecd3P5N6XNmO52V3YtHU+iJ/nGwmjLXqgZkTy1h
vchCV/LjFIPKgxgbjNxHLQk8DFrw
</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </KeyDescriptor>
    <KeyDescriptor use="encryption">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>MIIENzCCAx+gAwIBAgIUeCFFe0+1ab53ZzWGjXjhuiai/RUwDQYJKoZIhvcNAQEL
BQAwgakxCzAJBgNVBAYTAkpQMRMwEQYDVQQIDApTb21lLVN0YXRlMRIwEAYDVQQH
DAlTb21lLUNpdHkxITAfBgNVBAoMGEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDEQ
MA4GA1UECwwHc2VjdGlvbjEbMBkGA1UEAwwSdGVzdC1zcC1kZWNyeXB0aW9uMR8w
HQYJKoZIhvcNAQkBFhB0ZXN0QGV4YW1wbGUuY29tMCAXDTI0MDIxNDAwNDEzN1oY
DzIwNTQwMjA2MDA0MTM3WjCBqTELMAkGA1UEBhMCSlAxEzARBgNVBAgMClNvbWUt
U3RhdGUxEjAQBgNVBAcMCVNvbWUtQ2l0eTEhMB8GA1UECgwYSW50ZXJuZXQgV2lk
Z2l0cyBQdHkgTHRkMRAwDgYDVQQLDAdzZWN0aW9uMRswGQYDVQQDDBJ0ZXN0LXNw
LWRlY3J5cHRpb24xHzAdBgkqhkiG9w0BCQEWEHRlc3RAZXhhbXBsZS5jb20wggEi
MA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDUotTB/2kXNQcf5B74TapqbK5k
zNqs4aqYG1SkgFwQX7zw5DVaDmTPbSjB1XxO4KJdO2PWa+tUwYlgl0BbH0KJJKhu
Tty384+QlHydlcetY/SOTi07fxcA1K4aCNvXipZTUdPIAbvyOQa79kBiuEKhl2J7
JiTlMKA0P3R6dC/4ESxZGB5jKnqYUCkOwEoSgKrUTDCh4Fl66lchEaIxpp9ADf7t
cffueA6M7h6NvN968273G38qS06/DMq+60Mhf7hhNk4HblJFtjsHSj7//kUt6icN
v+ctD6HQopMla7HW+9PBEnHqhXpyQM4azL1ThD4HNT1HTG+UiNixUJoKmV8PAgMB
AAGjUzBRMB0GA1UdDgQWBBSgbBu2n4t9GiXfO2Qc2r2oLCdBOzAfBgNVHSMEGDAW
gBSgbBu2n4t9GiXfO2Qc2r2oLCdBOzAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3
DQEBCwUAA4IBAQBqQi7QWYp4m6zTCApDQskoNpe2+a8ojbRMQupM7ptM4PYWAmaB
Q2NoQFpKHwpNfHZnQ0BUucd+O2EQhOj9HHFGuDoKKEXvanUKopijep8+fOrsZ6X+
TFd03GPiWps0fdeC9uLVDFbJiYCE8Ucd7v0I20KOpOqBvbMCFnT8NY9v+5yrODQ3
NE87pGk2XbY1DAoAydomXg4/9QQXLSdp6s4EZcOapPQ/vW3kiZE3zrPv58gSdQ0o
7c0+Tkfe+9Z2rGydQSgR4HRSLdNA2cqE/aXSajF4k6JF2uNv4LBsl/DqsbQyu5ht
i0O2aH3biQSoXwJpGtlGBoJ9MNjxmckmUnry
</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
      <EncryptionMethod Algorithm="http://www.w3.org/2009/xmlenc11#aes256-gcm"/>
      <EncryptionMethod Algorithm="http://www.w3.org/2009/xmlenc11#aes128-gcm"/>
      <EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes256-cbc"/>
      <EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"/>
    </KeyDescriptor>
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService index="1" isDefault="true" Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://localhost/saml"/>
  </SPSSODescriptor>
</EntityDescriptor>`
    /* eslint-enable */
    expect(res.statusCode).toBe(200)
    // Remove ID attribute which change each time.
    expect(res.text.replace(/ ID="[^"]+"/, '')).toBe(expected.replace(/ ID="[^"]+"/, ''))
  })

  test('options', async () => {
    const { app } = await prepareSamlApp(false)
    const res = await request(app)
      .options('/saml/metadata')
      .send()

    expect(res.statusCode).toBe(204)
    expect(res.get('cache-control')).toBe('private, no-cache, must-revalidate')
    expect(res.get('vary')).toBe('Origin, Access-Control-Request-Headers')
    expect(res.get('access-control-allow-methods')).toBe('GET,HEAD,PUT,PATCH,POST,DELETE')
    expect(res.get('content-length')).toBe('0')
    expect(res.get('connection')).toBe('close')
    expect(res.get('date')).toBeDefined()
    expect(res.get('set-cookie')).toBeDefined()
  })
})
