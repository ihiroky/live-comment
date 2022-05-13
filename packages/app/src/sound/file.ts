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

export function normalizeSoundFileDefinition(def: SoundManifest['files'][number]): SoundFileDefinition {
  if (!Array.isArray(def)) {
    if (typeof def === 'string') {
      return { file: def }
    }
    if (isObject(def) && typeof def.file === 'string') {
      return def
    }
    throw new Error(`Unexpected format, must be string or { file: string, ... }: ${JSON.stringify(def)}`)
  }
  if (def.length !== 1 && def.length !== 2 && def.length !== 3) {
    throw new Error(`Unexpected format, must be array of its length 1, 2 or 3: ${JSON.stringify(def)}`)
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

export function openZipFile(
  zipData: Uint8Array,
  entryCallback: (name: string, def: SoundFileDefinition, data: Uint8Array) => void,
  noEntryCallback?: (fileName: string, data: Uint8Array) => void,
  unusedDefinitionCallback?: (unused: SoundFileDefinition[]) => void,
): void {
  const unzip = new Zlib.Unzip(zipData, { utf8: true })
  const utf8Decoder = new TextDecoder()
  const manifest: SoundManifest = JSON.parse(utf8Decoder.decode(unzip.decompress(MANIFEST_JSON)))
  if (!Array.isArray(manifest.files)) {
    throw new Error('The `files` property is not array type.')
  }
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
      manifestMap.delete(fileName)
    } else if (noEntryCallback) {
      noEntryCallback(fileName, data)
    }
  }
  if (unusedDefinitionCallback && manifestMap.size > 0) {
    unusedDefinitionCallback(Array.from(manifestMap.values()))
  }
}