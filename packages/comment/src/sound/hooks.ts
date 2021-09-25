import { isObject, getLogger } from 'common'
import { get, getAll, update, Store } from './db'
import { Zlib } from 'unzip'
import React from 'react'

const SOUND_FILE_PATH = '/sound/file'
const CHECKSUM_FILE_PATH = '/sound/checksum'
const MANIFEST_JSON = 'manifest.json'
const CHECKSUM = 'checksum'
const ACCEPTABLE_SUFFIX = ['.mp3', '.wav']

type SoundFileDefinition = {
  file: string
  displayName?: string
  alias?: string | string[]
}

type SoundManifest = {
  files: Array<
    | SoundFileDefinition
    | string
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string[]]
  >
}

type StoredSound = {
  displayName: string
  alias: string | string[] | null
  data: Uint8Array
}

type Sound = {
  name: string[]
  displayName: string
  data: Uint8Array
}

const log = getLogger('sound/hooks')

function isStoredSound(value: unknown): value is StoredSound {
  return isObject(value) && (
    typeof value.displayName === 'string' &&
    (typeof value.alias === 'string' || Array.isArray(value.alias) || value.alias === null) &&
    value.data instanceof Uint8Array
  )
}

function normalizeSoundFileDefinition(def: SoundManifest['files'][number]): SoundFileDefinition {
  if (!Array.isArray(def)) {
    return typeof def === 'string' ? { file: def } : def
  }

  if (def.length !== 1 && def.length !== 2 && def.length !== 3) {
    throw new Error(`Unexpected format: ${def}`)
  }
  switch (def.length) {
    case 1: return { file: def[0] }
    case 2: return { file: def[0], displayName: def[1] }
    case 3: return { file: def[0], displayName: def[1], alias: def[2] }
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


async function isSoundsAvailable(
  protocolHost: string,
  room: string,
  hash: string
): Promise<{ available: boolean, update: boolean, checksum: string }> {
  log.debug('[getNewChecksum]', protocolHost, room, hash)

  const abort = new AbortController()
  const timeout = window.setTimeout(() => abort.abort(), 3000)
  try {
    const checksum = await fetch(
      `${protocolHost}${CHECKSUM_FILE_PATH}?room=${room}&hash=${hash}`,
      {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors',
        headers: { 'Accept': 'text/plain' },
        signal: abort.signal
      }
    ).then((response: Response): Promise<string> | null => response.ok ? response.text() : null)
    if (checksum === null) {
      return {
        available: false,
        update: false,
        checksum: '',
      }
    }
    const storedChecksum = await get<string>(CHECKSUM)
    return {
      available: true,
      update: checksum !== storedChecksum,
      checksum,
    }
  } finally {
    window.clearTimeout(timeout)
  }
}

async function storeSounds(protocolHost: string, room: string, hash: string, checksum: string): Promise<void> {
  const blob = await fetch(
    `${protocolHost}${SOUND_FILE_PATH}?room=${room}&hash=${hash}`,
    {
      method: 'GET',
      cache: 'no-store',
      mode: 'cors',
      headers: { 'Accept': 'application/zip' }
    }
  ).then((response: Response): Promise<Blob> => response.blob())

  const reader = new FileReader()
  reader.addEventListener('load', function (): void {
    if (this.result === null) {
      log.error('[storeSounds] No data to read.')
      return
    }
    if (typeof this.result === 'string') {
      log.error('[storeSounds] The data is not buffer.')
      return
    }

    const zipData = new Uint8Array(this.result)

    const unzip = new Zlib.Unzip(zipData)
    const utf8Decoder = new TextDecoder()
    const manifest: SoundManifest = JSON.parse(utf8Decoder.decode(unzip.decompress(MANIFEST_JSON)))
    log.debug('manifest', manifest)
    const manifestMap = new Map(
      manifest.files
        .map(normalizeSoundFileDefinition)
        .filter(e => e !== null)
        .map(e => [e.file, e])
    )
    update((store: Store): void => {
      store.clear()
      store.put(CHECKSUM, checksum)
      for (const fileName of unzip.getFilenames()) {
        const name = trimAcceptableSuffix(fileName)
        if (name === null) {
          continue
        }
        const data = unzip.decompress(fileName)
        const manifestForFile = manifestMap.get(fileName)
        const displayName = manifestForFile?.displayName ?? name
        const alias = manifestForFile?.alias ?? null
        const value: StoredSound = { displayName, alias, data }
        store.put(name, value)
      }
    })
  })
  reader.readAsArrayBuffer(blob)
}

export function useSounds(existsSounds: boolean): Sound[] | null {
  const [sounds, setSounds] = React.useState<Sound[] | null>([])

  React.useEffect((): void => {
    if (!existsSounds) {
      setSounds([])
      return
    }

    setSounds(null)
    getAll<Sound>((id: string, value: unknown): Sound | undefined => {
      log.debug('getAll', id, value)
      if (id === CHECKSUM || !isStoredSound(value)) {
        return
      }
      const name = (value.alias && value.alias.length > 0 && value.alias[0].length > 0) ? [] : [id]
      const displayName = value.displayName
      const data = value.data
      const alias = value.alias
      if (alias) {
        if (typeof alias === 'string') {
          name.push(alias)
        } else if (Array.isArray(alias)) {
          for (const e of alias) {
            name.push(e)
          }
        }
      }
      return { name, displayName, data }
    }).then((values: Sound[]) => {
      setSounds(values)
    })
  }, [existsSounds])

  return sounds
}

export function useExistsSounds(protocolHost: string, room: string, hash: string): boolean {
  const [existsSounds, setExistsSounds] = React.useState(false)

  React.useEffect((): void => {
    setExistsSounds(false)
    isSoundsAvailable(protocolHost, room, hash).then(({ available, update, checksum }) => {
      if (available) {
        if (!update) {
          setExistsSounds(true)
          return
        }
        storeSounds(protocolHost, room, hash, checksum).then(() => setExistsSounds(true))
      }
    }).catch(e => {
      log.error(e)
      setExistsSounds(false)
    })
  }, [protocolHost, room, hash])

  return existsSounds
}

export function usePlaySound(): (data: Uint8Array, onFinsih?: () => void) => void {
  return React.useCallback((data: Uint8Array, onFinish?: () => void): void => {
    const context = new AudioContext()
    const source = context.createBufferSource()
    const gain = context.createGain()
    gain.gain.value = 0.05
    gain.connect(context.destination)
    const decodeSuccess: DecodeSuccessCallback = (decoded: AudioBuffer): void => {
      source.buffer = decoded
      source.connect(gain)
      source.loop = false
      source.start(0)
      source.addEventListener('ended', function(): void {
        source.stop(0)
        source.disconnect()
        gain.disconnect()
        onFinish && onFinish()
      })
    }
    const decodeError: DecodeErrorCallback = (e: DOMException): void => {
      source.stop(0)
      source.disconnect()
      gain.disconnect()
      onFinish && onFinish()
      log.error(e)
    }
    const buffer = Uint8Array.from(data)
    context.decodeAudioData(buffer.buffer, decodeSuccess, decodeError)
  }, [])
}