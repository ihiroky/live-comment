import {
  Stats,
  promises as fsp
} from 'fs'
import { LogLevel, getLogger } from '@/common/Logger'
import { XMLParser } from 'fast-xml-parser'
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
  appUrl: string
  cookieSecret: string
  callbackUrl: string
  entryPoint: string
  issuer: string      // Entity ID
  certPaths: string[] // Path to IDP certificate
  certs: string[]
  wantAssertionsSigned: boolean | undefined
  wantAuthnResponseSigned: boolean | undefined
  // Optional: If provided, use IdP metadata XML to populate entryPoint and certs
  idpMetadataPath?: string
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

function assertDefinedAndNotEmpty(object: Record<string, string>, prop: string, prefix?: string): void {
  if (!object[prop] || object[prop].length === 0) {
    throw new Error(`${prefix ? `${prefix}.${prop}` : prop} is empty or undefined.`)
  }
}

async function readKeyOrCertAsync(
  json: Record<string, string>,
  pathPropName: string,
  prefix?: string
): Promise<string> {
  assertDefinedAndNotEmpty(json, pathPropName, prefix)
  const path = json[pathPropName]
  try {
    const stat = await fsp.stat(path)
    if (!stat.isFile()) {
      throw new Error(`${prefix ? `${prefix}.${pathPropName}` : pathPropName}: ${path} is not a file.`)
    }
    const buffer = await fsp.readFile(path)
    return buffer.toString()
  } catch (e: unknown) {
    throw new Error(`${prefix ? `${prefix}.${pathPropName}` : pathPropName}: ${e}`)
  }

}

async function readCertsAsync(json: Record<string, string>, pathsPropName: string, prefix?: string): Promise<string[]> {
  assertDefinedAndNotEmpty(json, pathsPropName, prefix)
  const paths = json[pathsPropName]
  if (!Array.isArray(paths)) {
    throw new Error(`${prefix ? `${prefix}.${pathsPropName}` : pathsPropName} is not an array.`)
  }
  for (const path of paths) {
    try {
      const stat = await fsp.stat(path)
      if (!stat.isFile()) {
        throw new Error(`${prefix ? `${prefix}.${pathsPropName}` : pathsPropName} is not a file.`)
      }
    } catch (e: unknown) {
      throw new Error(`${prefix ? `${prefix}.${pathsPropName}` : pathsPropName}: ${e}`)
    }
  }
  const buffers = await Promise.all(paths.map(path => fsp.readFile(path)))
  return buffers.map(buffer => buffer.toString())
}

// Parse IdP metadata XML to extract
// - SingleSignOnService Location (prefer HTTP-Redirect, fallback HTTP-POST, otherwise first)
// - X509Certificate values under KeyDescriptor (prefer use="signing", fallback to all)
function toPemFromBase64(base64: string): string {
  const header = '-----BEGIN CERTIFICATE-----\n'
  const fooder = '\n-----END CERTIFICATE-----'
  const trimmed = base64.trim()
  return (trimmed.startsWith(header) ? '' : header) + trimmed + (trimmed.endsWith(fooder) ? '' : fooder) + '\n'
}

function parseIdpMetadata(xml: string): { entryPoint: string | undefined, certs: string[] } {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    removeNSPrefix: true,
    trimValues: true,
  })
  const doc = parser.parse(xml)
  const ed = doc?.EntityDescriptor
  const idp = ed?.IDPSSODescriptor
  if (!idp) {
    return { entryPoint: undefined, certs: [] }
  }

  // Normalize SSO services to array
  const ssoRaw = idp.SingleSignOnService
  const ssoArr: Array<{ Binding?: string, Location?: string }> =
    Array.isArray(ssoRaw) ? ssoRaw : (ssoRaw ? [ssoRaw] : [])
  let entryPoint: string | undefined = ssoArr.find(x => x.Binding?.includes('HTTP-Redirect'))?.Location
  if (!entryPoint) {
    entryPoint = ssoArr.find(x => x.Binding?.includes('HTTP-POST'))?.Location
  }

  // Normalize KeyDescriptor to array
  const kdRaw = idp.KeyDescriptor
  const kdArr: Array<{ use?: string, KeyInfo?: { X509Data?: { X509Certificate?: string | string[] } } }> =
    Array.isArray(kdRaw) ? kdRaw : (kdRaw ? [kdRaw] : [])
  const signingArr = kdArr.filter(k => !k.use || k.use.toLowerCase() === 'signing')
  const selected = signingArr.length > 0 ? signingArr : kdArr
  const certs: string[] = []
  for (const k of selected) {
    const x = k.KeyInfo?.X509Data?.X509Certificate
    const list = Array.isArray(x) ? x : (typeof x === 'string' && x.length > 0 ? [x] : [])
    for (const c of list) {
      const base64 = c.replace(/\s+/g, '')
      if (base64.length > 0) {
        certs.push(toPemFromBase64(base64))
      }
    }
  }

  return { entryPoint, certs }
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
    const s = c.saml
    assertDefinedAndNotEmpty(s, 'appUrl', 'saml')
    s.appUrl = s.appUrl.replace(/\/+$/, '') // Remove trailing slashes
    assertDefinedAndNotEmpty(s, 'cookieSecret', 'saml')
    assertDefinedAndNotEmpty(s, 'callbackUrl', 'saml')
    assertDefinedAndNotEmpty(s, 'issuer', 'saml')

    // If metadata is provided, prefer values from it
    if (s.idpMetadataPath) {
      try {
        const xml = await fsp.readFile(s.idpMetadataPath, { encoding: 'utf8' })
        const parsed = parseIdpMetadata(xml)
        if (!parsed.entryPoint) {
          throw new Error('Could not find SingleSignOnService Location in metadata.')
        }
        if (s.entryPoint && s.entryPoint !== parsed.entryPoint) {
          log.warn(`[SAML] entryPoint overridden by metadata: ${s.entryPoint} -> ${parsed.entryPoint}`)
        }
        s.entryPoint = parsed.entryPoint
        if (parsed.certs.length === 0) {
          throw new Error('No X509Certificate found in metadata.')
        }
        if (Array.isArray(s.certPaths) && s.certPaths.length > 0) {
          log.warn('[SAML] certs loaded from metadata. certPaths is ignored when idpMetadataPath is set.')
        }
        s.certs = parsed.certs
      } catch (e: unknown) {
        throw new Error(`saml.idpMetadataPath: ${e}`)
      }
    } else {
      // Backward-compatible path: require entryPoint and certPaths
      assertDefinedAndNotEmpty(s, 'entryPoint', 'saml')
      s.certs = await readCertsAsync(s, 'certPaths', 'saml')
    }
    s.wantAssertionsSigned = typeof s.wantAssertionsSigned === 'undefined' || !!s.wantAssertionsSigned
    s.wantAuthnResponseSigned = typeof s.wantAuthnResponseSigned === 'undefined' || !!s.wantAuthnResponseSigned
    if (s.decryption) {
      s.decryption.key = await readKeyOrCertAsync(s.decryption, 'keyPath', 'saml.decryption')
      s.decryption.cert = await readKeyOrCertAsync(s.decryption, 'certPath', 'saml.decryption')
    }
    if (s.signing) {
      s.signing.key = await readKeyOrCertAsync(s.signing, 'keyPath', 'saml.signing')
      s.signing.certs = await readCertsAsync(s.signing, 'certPaths', 'saml.signing')
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
    appUrl: string
    cookieSecret: string
    //path: string
    callbackUrl: string
    entryPoint: string
    issuer: string
    cert: string[]
    wantAssertionsSigned?: boolean
    wantAuthnResponseSigned?: boolean
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
        appUrl: cache.saml.appUrl,
        cookieSecret: cache.saml.cookieSecret,
        callbackUrl: cache.saml.callbackUrl,
        entryPoint: cache.saml.entryPoint,
        issuer: cache.saml.issuer,
        cert: cache.saml.certs,
        wantAssertionsSigned: cache.saml.wantAssertionsSigned,
        wantAuthnResponseSigned: cache.saml.wantAuthnResponseSigned,
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
