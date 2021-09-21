import fs from 'fs'
import {
  LogLevel,
  getLogger,
  isObject,
} from 'common'
import { Argv } from './argv'

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

const log = getLogger('Configuration')

function parseConfigJson(json: string): ServerConfig {
  const c = JSON.parse(json)
  if (!Array.isArray(c.rooms) || c.rooms.length === 0) {
    throw new Error('Room definition does not exist.')
  }
  for (const r of c.rooms) {
    if (!isRoom(r)) {
      throw new Error(`Unexpected room definition: ${JSON.stringify(r)}`)
    }
  }
  return c
}

export class Configuration {

  private path: string
  private cache: ServerConfig
  private lastUpdated: number

  readonly port: number
  readonly logLevel: LogLevel

  constructor(argv: Argv) {
    log.setLevel(argv.loglevel)
    this.path = argv.configPath
    this.lastUpdated = fs.statSync(this.path).mtimeMs
    this.cache = parseConfigJson(fs.readFileSync(this.path, { encoding: 'utf8' }))
    this.port = argv.port
    this.logLevel = argv.loglevel
  }

  reloadIfUpdatedAsync(): Promise<void> {
    return fs.promises.stat(this.path).then((stat: fs.Stats): Promise<void> => {
      if (stat.mtimeMs <= this.lastUpdated) {
        log.debug('[reloadIfUpdatedAsync] No update detected.')
        return Promise.resolve()
      }
      log.info('[reloadIfUpdatedAsync] Update detected.')
      this.lastUpdated = stat.mtimeMs
      return new Promise<void>((resolve: () => void, reject: (e: unknown) => void): void => {
        fs.promises.readFile(this.path, { encoding: 'utf8' })
          .then((json: string): void => {
            this.cache = parseConfigJson(json)
            log.info('[reloadIfUpdatedAsync] Update completed.')
            resolve()
          }).catch((e: unknown): void => {
            log.error('[reloadIfUpdatedAsync] Failed to load config.', e)
            reject(e)
          })
      })
    })
  }

  get rooms(): Room[] {
    return this.cache.rooms
  }
}
