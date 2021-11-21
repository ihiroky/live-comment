import { Configuration, loadConfigAsync,  } from './Configuration'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { assertNotNullable } from '@/common/assert'
import { LogLevels } from '@/common/Logger'
import { Argv } from './argv'

let testDataRoot: string
let argv: Argv

beforeEach(() => {
  testDataRoot = path.join(os.tmpdir(), 'ConfigurationSpecTestData')
  fs.mkdirSync(testDataRoot, { recursive: true })

  argv = {
    configPath: './server.config.json',
    port: 8080,
    loglevel: LogLevels.INFO,
  }
})

afterEach(() => {
  fs.rm
  fs.rmSync(testDataRoot, { recursive: true, force: true })
})

function writeConfig(filePath: string, cfg?: Record<string, unknown>): void {
  const config = cfg ?? {
    rooms: [
      {
        room: 'test',
        hash: 'ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db27ac185f8a0e1d5f84f88bc887fd67b143732c304cc5fa9ad8e6f57f50028a8ff',
      },
      {
        room: 'hoge',
        hash: 'dbb50237ad3fa5b818b8eeca9ca25a047e0f29517db2b25f4a8db5f717ff90bf0b7e94ef4f5c4e313dfb06e48fbd9a2e40795906a75c470cdb619cf9c2d4f6d9',
      },
    ],
    jwtPrivateKeyPath: path.join(testDataRoot, 'jwt.key'),
    jwtPublicKeyPath: path.join(testDataRoot, 'jwt.key.pub'),
  }
  fs.writeFileSync(filePath, JSON.stringify(config))
  if (!cfg) {
    createFile(config.jwtPrivateKeyPath as string)
    createFile(config.jwtPublicKeyPath as string)
  }
}

function createFile(path: string): void {
  fs.closeSync(fs.openSync(path, 'w'))
}

test('Error if configuration file does not have any room definition', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  writeConfig(configPath, {})

  await expect(loadConfigAsync(configPath, 0))
    .rejects
    .toThrow('Room definition does not exist.')
})

test('Error if configuration file have empty rooms', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  writeConfig(configPath, { rooms: [] })

  await expect(loadConfigAsync(configPath, 0))
    .rejects
    .toThrow('Room definition does not exist.')
})

test('Error if a room has no name', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  writeConfig(configPath, { rooms: [{ hash: 'hash' }] })

  await expect(loadConfigAsync(configPath, 0))
    .rejects
    .toThrow('Unexpected room definition: {"hash":"hash"}')
})

test('Error if a room has no hash', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  writeConfig(configPath, { rooms: [{ room: 'room' }] })

  await expect(loadConfigAsync(configPath, 0))
    .rejects
    .toThrow('Unexpected room definition: {"room":"room"}')
})

test('No jwtPrivateKeyPath', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  const soundFilePath = path.join(testDataRoot, 'soundFile.zip')
  const checksumPath = path.join(testDataRoot, 'soundFile.zip.md5')
  writeConfig(configPath, {
    rooms: [{ room: ' room', hash: 'hash' }],
    soundFilePath,
  })
  createFile(soundFilePath)
  createFile(checksumPath)

  await expect(loadConfigAsync(configPath, 0))
    .rejects
    .toThrow('jwtPrivateKeyPath is not defined.')
})

test('jwtPrivateKeyPath does not exist', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  const soundFilePath = path.join(testDataRoot, 'soundFile.zip')
  const checksumPath = path.join(testDataRoot, 'soundFile.zip.md5')
  const jwtPrivateKeyPath = path.join(testDataRoot, 'jwt.key')
  writeConfig(configPath, {
    rooms: [{ room: ' room', hash: 'hash' }],
    soundFilePath,
    jwtPrivateKeyPath,
  })
  createFile(soundFilePath)
  createFile(checksumPath)

  await expect(loadConfigAsync(configPath, 0))
    .rejects
    .toThrow(`ENOENT: no such file or directory, stat '${jwtPrivateKeyPath}'`)
})

test('jwtPrivateKeyPath is not a file.', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  const soundFilePath = path.join(testDataRoot, 'soundFile.zip')
  const checksumPath = path.join(testDataRoot, 'soundFile.zip.md5')
  const jwtPrivateKeyPath = path.join(testDataRoot, 'jwt.key')
  writeConfig(configPath, {
    rooms: [{ room: ' room', hash: 'hash' }],
    soundFilePath,
    jwtPrivateKeyPath,
  })
  createFile(soundFilePath)
  createFile(checksumPath)
  fs.mkdirSync(jwtPrivateKeyPath)

  await expect(loadConfigAsync(configPath, 0))
    .rejects
    .toThrow(`${jwtPrivateKeyPath} is not a file.`)
})

test('No jwtPublicKeyPath', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  const soundFilePath = path.join(testDataRoot, 'soundFile.zip')
  const checksumPath = path.join(testDataRoot, 'soundFile.zip.md5')
  const jwtPrivateKeyPath = path.join(testDataRoot, 'jwt.key')
  writeConfig(configPath, {
    rooms: [{ room: ' room', hash: 'hash' }],
    soundFilePath,
    jwtPrivateKeyPath,
  })
  createFile(soundFilePath)
  createFile(checksumPath)
  createFile(jwtPrivateKeyPath)

  await expect(loadConfigAsync(configPath, 0))
    .rejects
    .toThrow('jwtPublicKeyPath is not defined.')
})

test('jwtPublicKeyPath does not exist', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  const soundFilePath = path.join(testDataRoot, 'soundFile.zip')
  const checksumPath = path.join(testDataRoot, 'soundFile.zip.md5')
  const jwtPrivateKeyPath = path.join(testDataRoot, 'jwt.key')
  const jwtPublicKeyPath = path.join(testDataRoot, 'jwt.key.pub')
  writeConfig(configPath, {
    rooms: [{ room: ' room', hash: 'hash' }],
    soundFilePath,
    jwtPrivateKeyPath,
    jwtPublicKeyPath,
  })
  createFile(soundFilePath)
  createFile(checksumPath)
  createFile(jwtPrivateKeyPath)

  await expect(loadConfigAsync(configPath, 0))
    .rejects
    .toThrow(`ENOENT: no such file or directory, stat '${jwtPublicKeyPath}'`)
})

test('jwtPublicKeyPath is not a file.', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  const soundFilePath = path.join(testDataRoot, 'soundFile.zip')
  const checksumPath = path.join(testDataRoot, 'soundFile.zip.md5')
  const jwtPrivateKeyPath = path.join(testDataRoot, 'jwt.key')
  const jwtPublicKeyPath = path.join(testDataRoot, 'jwt.key.pub')
  writeConfig(configPath, {
    rooms: [{ room: ' room', hash: 'hash' }],
    soundFilePath,
    jwtPrivateKeyPath,
    jwtPublicKeyPath
  })
  createFile(soundFilePath)
  createFile(checksumPath)
  createFile(jwtPrivateKeyPath)
  fs.mkdirSync(jwtPublicKeyPath)

  await expect(loadConfigAsync(configPath, 0))
    .rejects
    .toThrow(`${jwtPublicKeyPath} is not a file.`)
})

test('Default port is 8080', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  writeConfig(configPath)
  argv.configPath = configPath
  const cache = await loadConfigAsync(configPath, 0)
  assertNotNullable(cache.content, 'cache.content must be defined.')

  const sut = new Configuration(argv, cache.content, cache.stat.mtimeMs)

  expect(sut.port).toBe(8080)
})

test('Get port specified at command line', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  writeConfig(configPath)
  argv.configPath = configPath
  argv.port = 8888
  const cache = await loadConfigAsync(configPath, 0)
  assertNotNullable(cache.content, 'cache.content must be defined.')

  const sut = new Configuration(argv, cache.content, cache.stat.mtimeMs)

  expect(sut.port).toBe(8888)
})

test('Default loglevel is INFO', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  writeConfig(configPath)
  argv.configPath = configPath
  const cache = await loadConfigAsync(configPath, 0)
  assertNotNullable(cache.content, 'cache.content must be defined.')

  const sut = new Configuration(argv, cache.content, cache.stat.mtimeMs)

  expect(sut.logLevel).toBe(LogLevels.INFO)
})

test('Get loglevel specified at command line', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  writeConfig(configPath)
  argv.configPath = configPath
  argv.loglevel = LogLevels.DEBUG
  const cache = await loadConfigAsync(configPath, 0)
  assertNotNullable(cache.content, 'cache.content must be defined.')

  const sut = new Configuration(argv, cache.content, cache.stat.mtimeMs)

  expect(sut.logLevel).toBe(LogLevels.DEBUG)
})

test('Not reload when timestamp is not changed.', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  writeConfig(configPath)
  argv.configPath = configPath

  const cache = await loadConfigAsync(configPath, 0)
  assertNotNullable(cache.content, 'cache.content must be defined.')
  const sut = new Configuration(argv, cache.content, cache.stat.mtimeMs)
  await sut.reloadIfUpdatedAsync()

  expect(sut['cache']).toBe(cache.content)
})

test('Reload when timestamp gets newer', async () => {
  const configPath = path.join(testDataRoot, 'test.json')
  writeConfig(configPath)
  argv.configPath = configPath

  const cache = await loadConfigAsync(configPath, 0)
  assertNotNullable(cache.content, 'cache.content must be defined.')
  const sut = new Configuration(argv, cache.content, cache.stat.mtimeMs)
  // Windows requires Date object for atime, utime
  const atime = new Date(cache.stat.atimeMs + 1000)
  const utime = new Date(cache.stat.mtimeMs + 1000)
  fs.utimesSync(configPath, atime, utime)
  await sut.reloadIfUpdatedAsync()

  expect(sut['cache']).not.toBe(cache.content)
})
