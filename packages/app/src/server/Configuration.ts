import {
  Stats,
  promises as fsp
} from 'fs'
import { LogLevel, getLogger } from '@/common/Logger'
import { isObject } from '@/common/utils'
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
  soundDirPath: string
  jwtPrivateKeyPath: string
  jwtPrivateKey: Buffer
  jwtPublicKeyPath: string
  jwtPublicKey: Buffer
}>

const log = getLogger('Configuration')

async function buildConfig(json: string): Promise<ServerConfig> {
  const c = JSON.parse(json)

  if (!Array.isArray(c.rooms) || c.rooms.length === 0) {
    throw new Error('Room definition does not exist.')
  }
  for (const r of c.rooms) {
    if (!isRoom(r)) {
      throw new Error(`Unexpected room definition: ${JSON.stringify(r)}`)
    }
  }

  if (!c.jwtPrivateKeyPath) {
    throw new Error('jwtPrivateKeyPath is not defined.')
  }
  const jwtPrivateKeyStat = await fsp.stat(c.jwtPrivateKeyPath)
  if (!jwtPrivateKeyStat.isFile()) {
    throw new Error(`${c.jwtPrivateKeyPath} is not a file.`)
  }

  if (!c.jwtPublicKeyPath) {
    throw new Error('jwtPublicKeyPath is not defined.')
  }
  const jwtPublicKeyStat = await fsp.stat(c.jwtPublicKeyPath)
  if (!jwtPublicKeyStat.isFile()) {
    throw new Error(`${c.jwtPublicKeyPath} is not a file.`)
  }

  const jwtPrivateKey = await fsp.readFile(c.jwtPrivateKeyPath)
  const jwtPublicKey = await fsp.readFile(c.jwtPublicKeyPath)
  return {
    ...c,
    jwtPrivateKey,
    jwtPublicKey,
  }
}
export async function loadConfigAsync(
  path: string,
  lastUpdated: number
): Promise<{ content: ServerConfig | null, stat: Stats }> {
  const stat = await fsp.stat(path)
  if (stat.mtimeMs <= lastUpdated) {
    return { content: null, stat }
  }
  const json = await fsp.readFile(path, { encoding: 'utf8' })
  const content = await buildConfig(json)
  return { content, stat }
}

export class Configuration {

  private path: string
  private cache: ServerConfig
  private lastUpdated: number

  readonly port: number
  readonly logLevel: LogLevel

  constructor(argv: Argv, cache: ServerConfig, lastupdated: number) {
    log.setLevel(argv.loglevel)
    this.path = argv.configPath
    this.lastUpdated = lastupdated
    this.cache = cache
    this.port = argv.port
    this.logLevel = argv.loglevel
  }

  async reloadIfUpdatedAsync(): Promise<void> {
    try {
      const config = await loadConfigAsync(this.path, this.lastUpdated)
      if (config.content === null) {
        log.debug('[reloadIfUpdatedAsync] No update detected.')
        return
      }

      log.info('[reloadIfUpdatedAsync] Update detected.')
      this.lastUpdated = config.stat.mtimeMs
      this.cache = config.content
    } catch (e: unknown) {
      log.error('[reloadIfUpdatedAsync] Failed to load config.', e)
    }
  }

  get rooms(): Room[] {
    return this.cache.rooms
  }

  get jwtPrivateKey(): Buffer {
    return this.cache.jwtPrivateKey
  }

  get jwtPublicKey(): Buffer {
    return this.cache.jwtPublicKey
  }

  get soundDirPath(): string {
    return this.cache.soundDirPath
  }
}
