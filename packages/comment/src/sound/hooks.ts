import { isObject, getLogger } from 'common'
import { get, getAll, update, StoreOperation } from './db'
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
  command?: string | string[]
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

type StoredSoundMetadata = {
  displayName: string
  command: string | string[] | null
}

type StoredSound = {
  data: Uint8Array
}

type SoundMetadata = {
  id: string
  displayName: string
  command: string[]
}

const log = getLogger('sound/hooks')

function isStoredSoundMetadata(value: unknown): value is StoredSoundMetadata {
  return isObject(value) && (
    typeof value.displayName === 'string' &&
    (typeof value.command === 'string' || Array.isArray(value.command) || value.command === null)
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


async function isSoundsAvailable(
  url: string,
  room: string,
  hash: string
): Promise<{ available: boolean, update: boolean, checksum: string }> {
  log.debug('[getNewChecksum]', url, room, hash)

  const abort = new AbortController()
  const timeout = window.setTimeout(() => abort.abort(), 3000)
  try {
    const checksum = await fetch(
      `${url}${CHECKSUM_FILE_PATH}?room=${room}&hash=${hash}`,
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
    const storedChecksum = await get<string>('soundMetadata', CHECKSUM)
    return {
      available: true,
      update: checksum !== storedChecksum,
      checksum,
    }
  } finally {
    window.clearTimeout(timeout)
  }
}

async function storeSounds(url: string, room: string, hash: string, checksum: string): Promise<void> {
  const zipBlob = await fetch(
    `${url}${SOUND_FILE_PATH}?room=${room}&hash=${hash}`,
    {
      method: 'GET',
      cache: 'no-store',
      mode: 'cors',
      headers: { 'Accept': 'application/zip' }
    }
  ).then((response: Response): Promise<Blob> => response.blob())
  const zipBuffer = await zipBlob.arrayBuffer()
  const zipData = new Uint8Array(zipBuffer)
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
  await update(['soundMetadata', 'sound'], (op: StoreOperation): void => {
    op.clear('soundMetadata')
    op.clear('sound')

    op.put('soundMetadata', CHECKSUM, checksum)
    for (const fileName of unzip.getFilenames()) {
      const id = trimAcceptableSuffix(fileName)
      if (id === null) {
        continue
      }
      const data = unzip.decompress(fileName)
      const manifestForFile = manifestMap.get(fileName)
      const displayName = manifestForFile?.displayName ?? id
      const command = manifestForFile?.command ?? null
      const metadataValue: StoredSoundMetadata = { displayName, command }
      op.put('soundMetadata', id, metadataValue)
      const value: StoredSound = { data }
      op.put('sound', id, value)
    }
  })
}

// TODO Sort by LRU ?
export function useSoundMetadata(
  existsSounds: boolean
): [Record<string, SoundMetadata>, Record<string, string>] | [] {
  const [sounds, setSounds] = React.useState<Record<string, SoundMetadata> | null>({})
  const [commands, setCommands] = React.useState<Record<string, string> | null>({})

  React.useEffect((): void => {
    if (!existsSounds) {
      setSounds({})
      return
    }

    setSounds(null)
    setCommands(null)
    getAll<SoundMetadata>('soundMetadata', (id: string, value: unknown): SoundMetadata | undefined => {
      log.debug('getAll', id, value)
      if (!isStoredSoundMetadata(value)) {
        return
      }
      const displayName = value.displayName
      const cmd = value.command
      const command: string[] = []
      if (cmd) {
        if (typeof cmd === 'string') {
          command.push(cmd)
        } else if (Array.isArray(cmd)) {
          for (const e of cmd) {
            command.push(e)
          }
        }
      }
      if (command.length === 0) {
        command.push(id)
      }
      return { id, displayName, command }
    }).then((values: SoundMetadata[]) => {
      const sounds: Record<string, SoundMetadata> = {}
      const commands: Record<string, string> = {}
      for (const v of values) {
        sounds[v.id] = v
        for (const cmd of v.command) {
          commands[cmd] = v.id
        }
      }
      setSounds(sounds)
      setCommands(commands)
    })
  }, [existsSounds])

  return (sounds !== null && commands !== null) ? [sounds, commands] : []
}

export function useExistsSounds(url: string, room: string | null, hash: string | null): boolean {
  const [existsSounds, setExistsSounds] = React.useState(false)

  React.useEffect((): void => {
    setExistsSounds(false)
    if (room === null || hash === null) {
      return
    }

    const urlEndNoSlash = url.replace(/\/+$/, '')
    isSoundsAvailable(urlEndNoSlash, room, hash).then(({ available, update, checksum }) => {
      if (available) {
        if (!update) {
          setExistsSounds(true)
          return
        }
        storeSounds(urlEndNoSlash, room, hash, checksum).then(() => setExistsSounds(true))
      }
    }).catch(e => {
      log.error(e)
      setExistsSounds(false)
    })
  }, [url, room, hash])

  return existsSounds
}

export function usePlaySound(): (id: string, volume: number, onFinsih?: (e?: Error | DOMException) => void) => void {
  return React.useCallback((id: string, volume: number, onFinish?: (e?: Error | DOMException) => void): void => {
    const soundData = get<StoredSound>('sound', id)
    const context = new AudioContext()
    const source = context.createBufferSource()
    const gain = context.createGain()
    gain.gain.value = volume / 100
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
      onFinish && onFinish(e)
    }
    soundData.then((data: StoredSound | null): void => {
      if (data === null) {
        source.stop(0)
        source.disconnect()
        gain.disconnect()
        onFinish && onFinish(new Error(`No sound data: ${id}`))
        return
      }
      const buffer = Uint8Array.from(data.data)
      context.decodeAudioData(buffer.buffer, decodeSuccess, decodeError)
    })
  }, [])
}

export function useRoomHash(): [string | null, string | null] {
  return React.useMemo((): [string | null, string | null] => {
    const params = new URLSearchParams(window.location.search)
    return [params.get('room'), params.get('hash')]
  }, [])
}
