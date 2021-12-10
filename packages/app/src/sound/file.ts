import { getLogger } from '@/common/Logger'
import { isObject } from '@/common/utils'
import { Zlib } from 'unzip'

export type SoundFileDefinition = {
  file: string
  displayName?: string
  command?: string | string[]
}

export type SoundManifest = {
  files: Array<
    | SoundFileDefinition
    | string
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string[]]
  >
}

export type SoundMetadata = {
  id: string
  displayName: string
  command: string[]
}

const MANIFEST_JSON = 'manifest.json'
const ACCEPTABLE_SUFFIX: ReadonlyArray<string> = ['.mp3', '.wav']
const log = getLogger('sound/file')

export function normalizeSoundFileDefinition(def: SoundManifest['files'][number]): SoundFileDefinition {
  if (!Array.isArray(def)) {
    if (typeof def === 'string') {
      return { file: def }
    }
    if (isObject(def) && typeof def.file === 'string') {
      return def
    }
    throw new Error(`Unexpected format: ${def}`)
  }
  if (def.length !== 1 && def.length !== 2 && def.length !== 3) {
    throw new Error(`Unexpected format: ${def}`)
  }
  switch (def.length) {
    case 1: return { file: def[0] }
    case 2: return { file: def[0], displayName: def[1] }
    case 3: return { file: def[0], displayName: def[1], command: def[2] }
  }
}

function trimAcceptableSuffix(fileName: string): string | null {
  for (const suffix of ACCEPTABLE_SUFFIX) {
    if (fileName.endsWith(suffix)) {
      return fileName.substring(0, fileName.length - suffix.length)
    }
  }
  return null
}

export async function openZipFile(
  zipBlob: Blob,
  entryCallback: (name: string, def: SoundFileDefinition, data: Uint8Array) => void,
  noEntryCallback?: (name: string, fileName: string, data: Uint8Array) => void,
): Promise<void> {
  const zipBuffer = await zipBlob.arrayBuffer()
  const zipData = new Uint8Array(zipBuffer)
  const unzip = new Zlib.Unzip(zipData, { utf8: true })
  const utf8Decoder = new TextDecoder()
  const manifest: SoundManifest = JSON.parse(utf8Decoder.decode(unzip.decompress(MANIFEST_JSON)))
  log.debug('sound file manifest:', manifest)
  const manifestMap = new Map(
    manifest.files
      .map(normalizeSoundFileDefinition)
      .filter(e => e !== null)
      .map(e => [e.file, e])
  )

  for (const fileName of unzip.getFilenames()) {
    const name = trimAcceptableSuffix(fileName)
    if (name === null) {
      // Skip manifest.json too.
      continue
    }
    const data = unzip.decompress(fileName)
    const def = manifestMap.get(fileName)
    if (def) {
      entryCallback(name, def, data)
    } else if (noEntryCallback) {
      noEntryCallback(name, fileName, data)
    }
  }
}