import { AcnMessage, assertNotNullable, ErrorMessage, LogLevels, createHash, isAcnOkMessage } from 'common'
import { Express } from 'express'
import request from 'supertest'
import { Argv } from './argv'
import { Configuration, loadConfigAsync } from './Configuration'
import { createApp } from './http'
import { sign } from 'jsonwebtoken'
import fs from 'fs'
import os from 'os'
import path from 'path'

let app: Express
let configPath: string
let soundDirPath: string
let config: Configuration

beforeEach(async () => {
  soundDirPath = path.join(os.tmpdir(), 'httpUnitTest')
  fs.mkdirSync(soundDirPath, { recursive: true })
  const configJson = {
    rooms: [
      {
        room: "test",
        hash: "ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db27ac185f8a0e1d5f84f88bc887fd67b143732c304cc5fa9ad8e6f57f50028a8ff"
      },
    ],
    soundDirPath,
    jwtPrivateKeyPath: `${__dirname}/../config/DO_NOT_USE-jwt.key.sample`,
    jwtPublicKeyPath:  `${__dirname}/../config/DO_NOT_USE-jwt.key.pub.sample`,
  }
  configPath = path.join(os.tmpdir(), 'http.spec.json')
  fs.writeFileSync(configPath, JSON.stringify(configJson))

  const argv: Argv = {
    configPath,
    port: 8080,
    loglevel: LogLevels.INFO,
  }
  const cache = await loadConfigAsync(argv.configPath, 0)
  assertNotNullable(cache.content, ('cache.content must be defined.'))
  config = new Configuration(argv, cache.content, cache.stat.mtimeMs)
  app = createApp(config)
})

afterEach(() => {
  if (configPath) {
    fs.rmSync(configPath)
  }
  if (soundDirPath) {
    fs.rmSync(soundDirPath, { recursive: true })
  }
})

test('Invalid message on login', async () => {
  const res = await request(app)
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
  const res = await request(app)
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
})

test('Invalid room', async () => {
  const acn: AcnMessage = {
    type: 'acn',
    room: 'test0',
    hash: createHash('test'),
  }
  const res = await request(app)
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

test('No authorization header', async () => {
  const res = await request(app)
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
  const res = await request(app)
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
  const jwt = sign({}, config.jwtPrivateKey, { expiresIn: '10s', algorithm: 'RS256' })
  const res = await request(app)
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
  const jwt = sign({ room: 'test' }, config.jwtPrivateKey, { expiresIn: '10s', algorithm: 'ES256' })
  const res = await request(app)
    .get('/sound/file')
    .set('Authorization', `Bearer ${jwt}`)
    .send()

  expect(res.statusCode).toBe(404)
  expect(res.body).toEqual({})
})

test('Get sound file', async () => {
  const jwt = sign({ room: 'test' }, config.jwtPrivateKey, { expiresIn: '10s', algorithm: 'ES256' })
  const soundFilePath = path.join(soundDirPath, 'test.zip')
  fs.writeFileSync(soundFilePath, 'content')
  const res = await request(app)
    .get('/sound/file')
    .set('Authorization', `Bearer ${jwt}`)
    .send()

  expect(res.statusCode).toBe(200)
  expect(res.get('content-type')).toBe('application/zip')
  expect(res.get('content-disposition')).toBe('attachment; filename="sounds.zip"')
  expect(res.text).toBe('content')
})

test('No checksum file', async () => {
  const jwt = sign({ room: 'test' }, config.jwtPrivateKey, { expiresIn: '10s', algorithm: 'ES256' })
  const res = await request(app)
    .get('/sound/checksum')
    .set('Authorization', `Bearer ${jwt}`)
    .send()

  expect(res.statusCode).toBe(404)
  expect(res.body).toEqual({})
})

test('Get checksum of sound file', async () => {
  const jwt = sign({ room: 'test' }, config.jwtPrivateKey, { expiresIn: '10s', algorithm: 'ES256' })
  const soundFilePath = path.join(soundDirPath, 'test.zip.md5')
  fs.writeFileSync(soundFilePath, 'content')
  const res = await request(app)
    .get('/sound/checksum')
    .set('Authorization', `Bearer ${jwt}`)
    .send()

  expect(res.statusCode).toBe(200)
  expect(res.text).toBe('content')
})