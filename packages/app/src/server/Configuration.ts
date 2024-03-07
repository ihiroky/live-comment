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

export type SamlConfig = {
  cookieSecret: string
  path: string
  entryPoint: string
  issuer: string      // Entity ID
  certPaths: string[] // Path to IDP certificate
  certs: string[]
  decryption?: {
    keyPath: string
    key: string
    certPath: string
    cert: string
  }
  signing?: {
    keyPath: string
    key: string
    certPaths: string[]
    certs: string[]
  }
}
export type ServerConfig = Readonly<{
  rooms: Room[]
  soundDirPath: string
  jwtPrivateKeyPath: string
  jwtPrivateKey: Buffer
  jwtPublicKeyPath: string
  jwtPublicKey: Buffer
  corsOrigins: string[]
  saml?: SamlConfig
}>

const log = getLogger('Configuration')

function assertProperty(object: Record<string, string>, prop: string): void {
  if (!object[prop] || object[prop].length === 0) {
    throw new Error(`${prop} is empty or undefined.`)
  }
}

async function readKeyOrCertAsync(json: Record<string, string>, pathPropName: string): Promise<string> {
  assertProperty(json, pathPropName)
  const path = json[pathPropName]
  const stat = await fsp.stat(path)
  if (!stat.isFile()) {
    throw new Error(`${json[pathPropName]} is not a file.`)
  }
  const buffer = await fsp.readFile(path)
  return buffer.toString()
}

async function readCertsAsync(json: Record<string, string>, pathsPropName: string): Promise<string[]> {
  assertProperty(json, pathsPropName)
  const paths = json[pathsPropName]
  if (!Array.isArray(paths)) {
    throw new Error(`${pathsPropName} is not an array.`)
  }
  for (const path of paths) {
    const stat = await fsp.stat(path)
    if (!stat.isFile()) {
      throw new Error(`${path} is not a file.`)
    }
  }
  const buffers = await Promise.all(paths.map(path => fsp.readFile(path)))
  return buffers.map(buffer => buffer.toString())
}

async function buildConfig(json: string): Promise<ServerConfig> {

  // Ensure completeness of ServerConfig in this function.

  const c = JSON.parse(json)

  if (!Array.isArray(c.rooms) || c.rooms.length === 0) {
    throw new Error('Room definition does not exist.')
  }
  for (const r of c.rooms) {
    if (!isRoom(r)) {
      throw new Error(`Unexpected room definition: ${JSON.stringify(r)}`)
    }
  }

  c.jwtPrivateKey = await readKeyOrCertAsync(c, 'jwtPrivateKeyPath')
  c.jwtPublicKey = await readKeyOrCertAsync(c, 'jwtPublicKeyPath')

  if (!Array.isArray(c.corsOrigins) || c.corsOrigins.length === 0) {
    throw new Error('corsOrigins is not defined.')
  }

  if (c.saml) {
    assertProperty(c.saml, 'cookieSecret')
    assertProperty(c.saml, 'path')
    assertProperty(c.saml, 'entryPoint')
    assertProperty(c.saml, 'issuer')
    c.saml.certs = await readCertsAsync(c.saml, 'certPaths')
    if (c.saml.decryption) {
      c.saml.decryption.key = await readKeyOrCertAsync(c.saml.decryption, 'keyPath')
      c.saml.decryption.cert = await readKeyOrCertAsync(c.saml.decryption, 'certPath')
    }
    if (c.saml.signing) {
      c.saml.signing.key = await readKeyOrCertAsync(c.saml.signing, 'keyPath')
      c.saml.signing.certs = await readCertsAsync(c.saml.signing, 'certPaths')
    }
  }
  return c
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
  readonly saml: {
    cookieSecret: string
    path: string
    entryPoint: string
    issuer: string
    cert: string[]
    privateKey?: string
    decryptionPvk?: string

    // for generating SP metadata
    decryptionCert?: string
    signingCert?: string[]
  } | undefined

  constructor(argv: Argv, cache: ServerConfig, lastupdated: number) {
    log.setLevel(argv.loglevel)
    this.path = argv.configPath
    this.lastUpdated = lastupdated
    this.cache = cache
    this.port = argv.port
    this.logLevel = argv.loglevel
    if (cache.saml) {
      this.saml = {
        cookieSecret: cache.saml.cookieSecret,
        path: cache.saml.path,
        entryPoint: cache.saml.entryPoint,
        issuer: cache.saml.issuer,
        cert: cache.saml.certs,
        privateKey: cache.saml.signing?.key,
        signingCert: cache.saml.signing?.certs,
        decryptionPvk: cache.saml.decryption?.key,
        decryptionCert: cache.saml.decryption?.cert,
      }
    }
  }

  async reloadIfUpdatedAsync(): Promise<void> {
    try {
      const config = await loadConfigAsync(this.path, this.lastUpdated)
      if (config.content === null) {
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

  get corsOrigins(): (RegExp | string)[] {
    return this.cache.corsOrigins.map((o) => {
      return (o.startsWith('/') && o.endsWith('/')) ? new RegExp(o.slice(1, -1)) : o
    })
  }
}
