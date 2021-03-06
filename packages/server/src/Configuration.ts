import fs from 'fs'
import path from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import {
  parseLogLevel,
  LogLevel,
  getLogger,
  isObject,
} from 'common'

export type Room = Readonly<{
  room: string
  hash: string
}>

function isRoom(obj: unknown): obj is ServerConfig['rooms'][number] {
  if (!isObject(obj)) {
    return false
  }
  return typeof obj.room === 'string' && typeof obj.hash === 'string'
}

type ServerConfig = Readonly<{
  rooms: Room[]
}>

const ENV_CONFIG = 'LIVE_COMMENT_SERVER_CONFIG'
const DEFAULT_PORT = 8080

function getHomeConfigPath(): string {
  const home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']
  if (!home) {
    throw new Error('Home directory does not exist.')
  }
  return path.join(home, '.config', 'live-comment', 'server.config.json')
}

function isFile(path: string): boolean {
  try {
    return fs.statSync(path).isFile()
  } catch (e: unknown) {
    return false
  }
}

function findConfigPath(v?: string): string {
  // Specified at command line.
  if (v && isFile(v)) {
    return v
  }
  // Specified by environment variable.
  const envConfigPath = process.env[ENV_CONFIG]
  if (envConfigPath) {
    return envConfigPath
  }
  // In home directory.
  const homeConfigPath = getHomeConfigPath()
  if (isFile(homeConfigPath)) {
    return homeConfigPath
  }
  // Repository default.
  const pathInRepository = './server.config.json'
  if (isFile(pathInRepository)) {
    return pathInRepository
  }
  throw new Error(`Configuration file does not exist in [${v}, ${homeConfigPath}, ${pathInRepository}]`)
}

function parsePort(v: unknown): number {
  const n = Number(v)
  return isNaN(n) ? DEFAULT_PORT : n
}

const argv = yargs(hideBin(process.argv))
  .option('configPath', {
    alias: 'c',
    type: 'string',
    description: 'Path to configuration file (JSON).',
    default: undefined,
    coerce: findConfigPath
  })
  .option('port', {
    alias: 'p',
    type: 'number',
    description: `WebSocket server listen port (default: ${DEFAULT_PORT}).`,
    default: undefined,
    coerce: parsePort
  })
  .option('loglevel', {
    alias: 'l',
    type: 'string',
    description: 'Log level (OFF, ERROR, WARN, INFO, DEBUG, TRACE, default: INFO).',
    default: undefined,
    coerce: parseLogLevel
  })
  .help()
  .argv

const log = getLogger('Configuration')
log.setLevel(argv.loglevel)

function parseConfigJson(json: string): ServerConfig {
  const c = JSON.parse(json)
  if (!Array.isArray(c.rooms) || c.rooms.length === 0) {
    log.error('Room definition does not exist.')
    return {
      rooms: []
    }
  }
  for (const r of c.rooms) {
    if (!isRoom(r)) {
      log.error(`Unexpected room definition: ${JSON.stringify(r)}`)
      return {
        rooms: []
      }
    }
  }
  return c
}

export class Configuration {

  private path: string
  private cache: Promise<ServerConfig>
  private lastUpdated: number

  constructor() {
    this.path = argv.configPath
    this.lastUpdated = fs.statSync(this.path).mtimeMs
    const serverConfig = parseConfigJson(fs.readFileSync(this.path, { encoding: 'utf8' }))
    this.cache = Promise.resolve(serverConfig)

  }

  reloadIfUpdatedAsync(): Promise<void> {
    return fs.promises.stat(this.path).then((stat: fs.Stats): Promise<void> => {
      if (stat.mtimeMs <= this.lastUpdated) {
        log.debug('[reloadIfUpdatedAsync] No update detected.')
        return Promise.resolve()
      }
      log.info('[reloadIfUpdatedAsync] Update detected.')
      this.lastUpdated = stat.mtimeMs
      return new Promise<void>((resolve: () => void): void => {
        this.cache = fs.promises.readFile(this.path, { encoding: 'utf8' })
          .then((json: string): ServerConfig => parseConfigJson(json))
        this.cache.then((): void => {
          log.info('[reloadIfUpdatedAsync] Update completed.')
          resolve()
        })
      })
    })
  }

  get port(): number {
    return argv.port
  }

  get rooms(): Promise<Room[]> {
    return this.cache.then((c: ServerConfig): Room[] => c.rooms)
  }

  get logLevel(): LogLevel {
    return argv.loglevel
  }
}
