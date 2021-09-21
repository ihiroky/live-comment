import { Configuration,  } from './Configuration'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { LogLevels } from 'common'

let configPath: string

beforeAll(() => {
  // Remove jest option which overlaps Configuration
  const i = process.argv.findIndex(v => v === '-c')
  process.argv.splice(i, 2)
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

/*** Test order (current directory -> home -> env -> cmd args) is important ***/

test('Load from file in current directory', () => {
  // Use server.config.json in this repository.
  const sut = new Configuration()

  expect(sut.rooms.map(r => r.room).sort()).toEqual(['hoge', 'test'])
})

test('Load from file in the home config direcotry', () => {
  const homePath = os.tmpdir()
  configPath = path.join(homePath, '.config')
  const configFileParentPath = path.join(configPath, 'live-comment')
  fs.mkdirSync(configFileParentPath, { recursive: true })
  const configFilePath = path.join(configFileParentPath, 'server.config.json')
  writeConfig(configFilePath)
  process.env['HOME'] = homePath

  const sut = new Configuration()

  expect(sut.rooms.map(r => r.room).sort()).toEqual(['hoge', 'test'])
})

test('Load from file specified by envirnment variable', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath)
  process.env['LIVE_COMMENT_SERVER_CONFIG'] = configPath

  const sut = new Configuration()

  expect(sut.rooms.map(r => r.room).sort()).toEqual(['hoge', 'test'])
})

test('Load from file specified by command line', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath)
  process.argv.push(...['--configPath', configPath])

  const sut = new Configuration()

  expect(sut.rooms.map(r => r.room).sort()).toEqual(['hoge', 'test'])
})


test('Error if configuration file does not have any room definition', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath, {})
  process.argv.push(...['--configPath', configPath])

  expect(() => new Configuration()).toThrow('Room definition does not exist.')
})

test('Error if configuration file have empty rooms', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath, { rooms: [] })
  process.argv.push(...['--configPath', configPath])

  expect(() => new Configuration()).toThrow('Room definition does not exist.')
})

test('Error if a room has no name', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath, { rooms: [{ hash: 'hash' }] })
  process.argv.push(...['--configPath', configPath])

  expect(() => new Configuration()).toThrow('Unexpected room definition: {"hash":"hash"}')
})

test('Error if a room has no hash', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath, { rooms: [{ room: 'room' }] })
  process.argv.push(...['--configPath', configPath])

  expect(() => new Configuration()).toThrow('Unexpected room definition: {"room":"room"}')
})

test('Default port is 8080', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath)
  process.argv.push(...['--configPath', configPath])

  const sut = new Configuration()

  expect(sut.port).toBe(8080)
})

test('Get port specified at command line', () => {
  process.argv.push(...['-p', '8888'])
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath)

  const sut = new Configuration()

  expect(sut.port).toBe(8888)
})

test('Default loglevel is INFO', () => {
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath)
  process.argv.push(...['--configPath', configPath])

  const sut = new Configuration()

  expect(sut.logLevel).toBe(LogLevels.INFO)
})

test('Get loglevel specified at command line', () => {
  process.argv.push(...['-l', 'debug'])
  configPath = path.join(os.tmpdir(), 'test.json')
  writeConfig(configPath)

  const sut = new Configuration()

  expect(sut.logLevel).toBe(LogLevels.DEBUG)
})
