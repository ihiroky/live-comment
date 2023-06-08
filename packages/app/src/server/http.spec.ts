/**
 * @jest-environment node
 */
import { AcnMessage, ErrorMessage, isAcnOkMessage } from '@/common/Message'
import { assertNotNullable } from '@/common/assert'
import { LogLevels } from '@/common/Logger'
import { createHash } from '@/common/utils'
import { Express } from 'express'
import request from 'supertest'
import { Argv } from './argv'
import { Configuration, loadConfigAsync } from './Configuration'
import { createApp, saveSoundFile } from './http'
import { sign } from 'jsonwebtoken'
import crypto from 'node:crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { test, expect, beforeEach, afterEach } from '@jest/globals'

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
    jwtPrivateKeyPath: `${__dirname}/../../config/DO_NOT_USE-jwt.key.sample`,
    jwtPublicKeyPath:  `${__dirname}/../../config/DO_NOT_USE-jwt.key.pub.sample`,
    corsOrigins: ['http://localhost:8888'],
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
  const ec384Key = `-----BEGIN EC PRIVATE KEY-----
MIGkAgEBBDBwP13IPv6F6gmyCnbcn1guwvDjpryOE+kJC4WgICZl0Zy+uHBInIjZ
eW8+m+l76zOgBwYFK4EEACKhZANiAASNKKEaueDpIzbLBioQemjkQ5VR53gavGvn
khBw71PYdkE5Be63+rEey7CH9/nEaUgdipqUWkbJCqu3TIZ2Kk59dzLarWPP8Pkr
S5nTR/40W8nCmhl3axYknwxhleDjiYU=
-----END EC PRIVATE KEY-----`
  const jwt = sign({}, ec384Key, { expiresIn: '10s', algorithm: 'ES384' })
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
  const room = 'test'
  const jwt = sign({ room }, config.jwtPrivateKey, { expiresIn: '10s', algorithm: 'ES256' })
  const soundFilePath = path.join(soundDirPath, 'test.zip')
  fs.writeFileSync(soundFilePath, 'content')
  const res = await request(app)
    .get('/sound/file')
    .set('Authorization', `Bearer ${jwt}`)
    .send()

  expect(res.statusCode).toBe(200)
  expect(res.get('content-type')).toBe('application/zip')
  expect(res.get('content-disposition')).toBe(`attachment; filename="${room}-sounds.zip"`)
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
  const soundFilePath = path.join(soundDirPath, 'test.md5')
  fs.writeFileSync(soundFilePath, 'content')
  const res = await request(app)
    .get('/sound/checksum')
    .set('Authorization', `Bearer ${jwt}`)
    .send()

  expect(res.statusCode).toBe(200)
  expect(res.text).toBe('content')
})

test('Post sound file', async () => {
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

test('Post zip which contains invalid content', async () => {
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
