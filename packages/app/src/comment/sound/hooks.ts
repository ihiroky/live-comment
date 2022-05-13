import { isObject, fetchWithTimeout } from '@/common/utils'
import { getLogger } from '@/common/Logger'
import { get, getAll, update, StoreOperation } from './db'
import { useState, useEffect, useCallback } from 'react'
import {
  SoundMetadata,
  openZipFile,
  SoundFileDefinition,
} from '@/sound/file'

const SOUND_FILE_PATH = '/sound/file'
const CHECKSUM_FILE_PATH = '/sound/checksum'
const CHECKSUM = 'checksum'

type StoredSoundMetadata = {
  displayName: string
  command: string | string[] | null
}

type StoredSound = {
  data: Uint8Array
}

const log = getLogger('sound/hooks')

function isStoredSoundMetadata(value: unknown): value is StoredSoundMetadata {
  return isObject(value) && (
    typeof value.displayName === 'string' &&
    (typeof value.command === 'string' || Array.isArray(value.command) || value.command === null)
  )
}

async function isSoundsAvailable(
  url: string,
  token: string,
  room: string,
): Promise<{ available: boolean, update: boolean, checksum: string }> {
  log.debug('[getNewChecksum]', url, token)

  const checksum = await fetchWithTimeout(
    `${url}${CHECKSUM_FILE_PATH}`,
    {
      method: 'GET',
      cache: 'no-store',
      mode: 'cors',
      headers: {
        'Accept': 'text/plain',
        'Authorization': `Bearer ${token}`,
      },
    },
    3000
  ).then((response: Response): Promise<string> | null => {
    return response.ok ? response.text() : null
  })
  if (checksum === null) {
    return {
      available: false,
      update: false,
      checksum: '',
    }
  }
  const storedChecksum = await get<string>(room, 'soundMetadata', CHECKSUM)
  return {
    available: true,
    update: checksum !== storedChecksum,
    checksum,
  }
}

async function storeSounds(url: string, token: string, room: string, checksum: string): Promise<void> {
  const zipBlob = await fetchWithTimeout(
    `${url}${SOUND_FILE_PATH}`,
    {
      method: 'GET',
      cache: 'no-store',
      mode: 'cors',
      headers: {
        'Accept': 'application/zip',
        'Authorization': `Bearer ${token}`,
      },
    },
    10000
  ).then((response: Response): Promise<Blob> | null => {
    return response.ok ? response.blob() : null
  })
  if (zipBlob === null) {
    throw new Error('Failed to get sound file.')
  }
  const zipBuffer = await zipBlob.arrayBuffer()

  await update(room, ['soundMetadata', 'sound'], (op: StoreOperation): void => {
    op.clear('soundMetadata')
    op.clear('sound')
    op.put('soundMetadata', CHECKSUM, checksum)
    openZipFile(
      new Uint8Array(zipBuffer),
      (name: string, def: SoundFileDefinition, data: Uint8Array): void => {
        const displayName = def.displayName ?? name
        const command = def.command ?? null
        // TODO add index to sort by stored order
        const metadataValue: StoredSoundMetadata = { displayName, command }
        op.put('soundMetadata', name, metadataValue)
        const value: StoredSound = { data }
        op.put('sound', name, value)
      }
    )
  })
}

export function useExistsSounds(url: string, token: string, room: string): boolean {
  const [existsSounds, setExistsSounds] = useState(false)

  useEffect((): void => {
    setExistsSounds(false)
    if (!token) {
      return
    }

    const urlEndNoSlash = url.replace(/\/+$/, '')
    isSoundsAvailable(urlEndNoSlash, token, room).then(({ available, update, checksum }) => {
      if (!available) {
        return false
      }
      return update
        ? storeSounds(urlEndNoSlash, token, room, checksum).then(() => true)
        : true
    }).then((available: boolean): void => {
      if (available) {
        setExistsSounds(true)
      }
    }).catch(e => {
      log.error(e)
    })
  }, [url, token, room])

  return existsSounds
}

// TODO Sort by LRU ?
export function useSoundMetadata(
  room: string,
  existsSounds: boolean
): [Record<string, SoundMetadata>, Record<string, string>] | [] {
  const [sounds, setSounds] = useState<Record<string, SoundMetadata> | null>({})
  const [commands, setCommands] = useState<Record<string, string> | null>({})

  useEffect((): void => {
    setSounds(null)
    setCommands(null)
    if (!existsSounds) {
      return
    }

    getAll<SoundMetadata>(room, 'soundMetadata', (id: string, value: unknown): SoundMetadata | undefined => {
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
      // TODO Sort by stored order
      setSounds(sounds)
      setCommands(commands)
    })
  }, [existsSounds, room])

  return (sounds !== null && commands !== null) ? [sounds, commands] : []
}

export function usePlaySound(
  room: string
): (id: string, volume: number, onFinsih?: (e?: Error | DOMException) => void) => void {
  return useCallback((id: string, volume: number, onFinish?: (e?: Error | DOMException) => void): void => {
    const soundData = get<StoredSound>(room, 'sound', id)
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
  }, [room])
}
