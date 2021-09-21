import { Configuration,  } from './Configuration'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { LogLevels } from 'common'
import { Argv } from './argv'

let configPath: string
let argv: Argv

beforeAll(() => {
  configPath = ''
  argv = {
    configPath: './server.config.json',
    port: 8080,
    loglevel: LogLevels.INFO,
  }
})

afterEach(() => {
  if (configPath) {
    fs.rmSync(configPath, { recursive: true })
    configPath = ''
  }
})

function writeConfig(path: string, cfg?: Record<string, unknown>): void {
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
  }
  fs.writeFileSync(path, JSON.stringify(config))
}

test('Error if configuration file does not have any room definition', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath, {})
  argv.configPath = configPath

  expect(() => new Configuration(argv)).toThrow('Room definition does not exist.')
})

test('Error if configuration file have empty rooms', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath, { rooms: [] })
  argv.configPath = configPath

  expect(() => new Configuration(argv)).toThrow('Room definition does not exist.')
})

test('Error if a room has no name', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath, { rooms: [{ hash: 'hash' }] })
  argv.configPath = configPath

  expect(() => new Configuration(argv)).toThrow('Unexpected room definition: {"hash":"hash"}')
})

test('Error if a room has no hash', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath, { rooms: [{ room: 'room' }] })
  argv.configPath = configPath

  expect(() => new Configuration(argv)).toThrow('Unexpected room definition: {"room":"room"}')
})

test('Default port is 8080', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath)
  argv.configPath = configPath

  const sut = new Configuration(argv)

  expect(sut.port).toBe(8080)
})

test('Get port specified at command line', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath)
  argv.configPath = configPath
  argv.port = 8888

  const sut = new Configuration(argv)

  expect(sut.port).toBe(8888)
})

test('Default loglevel is INFO', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath)
  argv.configPath = configPath

  const sut = new Configuration(argv)

  expect(sut.logLevel).toBe(LogLevels.INFO)
})

test('Get loglevel specified at command line', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath)
  argv.configPath = configPath
  argv.loglevel = LogLevels.DEBUG

  const sut = new Configuration(argv)

  expect(sut.logLevel).toBe(LogLevels.DEBUG)
})
