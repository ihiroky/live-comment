import { useExistsSounds, usePlaySound, useSoundMetadata } from './hooks'
import { renderHook, act, waitFor } from '@testing-library/react'
import { get, update, getAll } from './db'
import { Zlib } from 'unzip'
import { basename } from 'path'
import { assertNotNullable } from '@/common/assert'
import { jest, describe, test, expect, beforeEach } from '@jest/globals'

jest.mock('./db')
jest.mock('unzip')

describe('useExistsSounds', () => {
  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    global.TextDecoder = require('util').TextDecoder
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    global.TextEncoder = require('util').TextEncoder
  })
  test('Do nothing if no token', async () => {
    const { result } = renderHook(() => useExistsSounds('url', '', 'room'))
    const actual = result.current
    await new Promise<void>((resolve: () => void): void => {
      setTimeout(resolve, 50)
    })
    const actualAfterWait = result.current

    expect(actual).toBe(false)
    expect(actualAfterWait).toBe(false)
  })

  test('Checksum does not exist', async () => {
    jest.mocked(get).mockResolvedValue('cs')
    window.fetch = jest.fn<typeof window.fetch>().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('')
    } as Response)

    const { result } = renderHook(() => useExistsSounds('https://host/', 'token', 'room'))
    await new Promise<void>((resolve: () => void): void => {
      setTimeout(resolve, 50)
    })

    expect(result.current).toBe(false)
    expect(get).not.toBeCalled()
    expect(window.fetch).toBeCalledWith('https://host/sound/checksum',{
      cache: 'no-store',
      headers: {
        Accept: 'text/plain',
        Authorization: 'Bearer token'
      },
      method: 'GET',
      mode: 'cors',
      signal: expect.any(AbortSignal)
    })
    expect(window.fetch).toBeCalledTimes(1)
  })

  test('Checksum exists and no update', async () => {
    jest.mocked(get).mockResolvedValue('cs')
    window.fetch = jest.fn<typeof window.fetch>().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('cs')
    } as Response)

    const { result } = renderHook(() => useExistsSounds('https://host/', 'token', 'room'))
    await waitFor(() => expect(result.current).toBe(true))

    expect(result.current).toBe(true)
    expect(get).toBeCalledWith('room', 'soundMetadata', 'checksum')
    expect(window.fetch).toBeCalledWith('https://host/sound/checksum',{
      cache: 'no-store',
      headers: {
        Accept: 'text/plain',
        Authorization: 'Bearer token',
      },
      method: 'GET',
      mode: 'cors',
      signal: expect.any(AbortSignal)
    })
    expect(window.fetch).toBeCalledTimes(1)
  })

  test('Checksum and update exist, but no sound file exists', async () => {
    jest.mocked(get).mockResolvedValue('storedChecksum')
    window.fetch = jest.fn<typeof window.fetch>()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('newChecksum'),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve(''),
      } as Response)

    const { result } = renderHook(() => useExistsSounds('https://host/', 'token', 'room'))
    await new Promise<void>((resolve: () => void): void => {
      setTimeout(resolve, 50)
    })

    expect(result.current).toBe(false)
    expect(get).toBeCalledWith('room', 'soundMetadata', 'checksum')
    expect(window.fetch).toHaveBeenNthCalledWith(1, 'https://host/sound/checksum',{
      cache: 'no-store',
      headers: {
        Accept: 'text/plain',
        Authorization: 'Bearer token',
      },
      method: 'GET',
      mode: 'cors',
      signal: expect.any(AbortSignal)
    })
    expect(window.fetch).toHaveBeenNthCalledWith(2, 'https://host/sound/file',{
      cache: 'no-store',
      headers: {
        Accept: 'application/zip',
        Authorization: 'Bearer token',
      },
      method: 'GET',
      mode: 'cors',
      signal: expect.any(AbortSignal)
    })
    expect(window.fetch).toBeCalledTimes(2)
  })

  function decompressImpl(fn: string): Uint8Array {
    if (fn === 'manifest.json') {
      return new TextEncoder().encode(`{
        "files": [
          {
            "file": "firework000.mp3",
            "displayName": "花火",
            "command": "fw"
          }, {
            "file": "pegion000.wav",
            "displayName": "鳩",
            "command": ["pegion", "poppo", "鳩"]
          },[
            "quiz000.mp3",
            "クイズ"
          ], [
            "quiz-correct000.mp3",
            "正解",
            "correct"
          ], [
            "quiz-wrong000.mp3",
            "不正解",
            ["wrong", "incorrect"]
          ],
          "filenameonly.wav"
        ]
      }`)
    }
    return new Uint8Array()
  }

  test('Checksum and update exist, and store sound file', async () => {
    jest.mocked(get).mockResolvedValue('storedChecksum')
    window.fetch = jest.fn<typeof window.fetch>()
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('newChecksum'),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }),
      } as Response)
    const soundFiles = ['firework000.mp3', 'pegion000.wav', 'quiz000.mp3', 'quiz-correct000.mp3', 'quiz-wrong000.mp3', 'filenameonly.wav']
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.mocked(Zlib.Unzip).mockImplementation((): any => {
      return {
        decompress(fn: string): Uint8Array { return decompressImpl(fn) },
        getFilenames(): string[] { return soundFiles.concat('manifest.json') },
        setPassword: () => undefined,
        getFileHeaderAttribute: () => 0,
      }
    })
    const storeOperationMock = {
      put: jest.fn(),
      clear: jest.fn(),
      transaction: {
        commit: jest.fn(),
        abort: jest.fn(),
      }
    }
    jest.mocked(update).mockImplementation((_dbName, _storNames, updater) => {
      updater(storeOperationMock)
      return Promise.resolve()
    })

    const { result } = renderHook(() => useExistsSounds('https://host/', 'token', 'room'))
    await act(async () => {
      await new Promise<void>((resolve: () => void): void => {
        setTimeout(resolve, 50)
      })
    })

    expect(result.current).toBe(true)
    expect(update).toBeCalledWith('room', ['soundMetadata', 'sound'], expect.any(Function))
    expect(storeOperationMock.clear).toHaveBeenNthCalledWith(1, 'soundMetadata')
    expect(storeOperationMock.clear).toHaveBeenNthCalledWith(2, 'sound')
    expect(storeOperationMock.put).toHaveBeenNthCalledWith(1, 'soundMetadata', 'checksum', 'newChecksum')
    const metadata: Record<string, unknown> = {
      'firework000': {
        displayName: '花火',
        command: 'fw',
      },
      'pegion000': {
        displayName: '鳩',
        command: ['pegion', 'poppo', '鳩'],
      },
      'quiz000': {
        displayName: 'クイズ',
        command: null,
      },
      'quiz-correct000': {
        displayName: '正解',
        command: 'correct',
      },
      'quiz-wrong000': {
        displayName: '不正解',
        command: ['wrong', 'incorrect'],
      },
      'filenameonly': {
        displayName: 'filenameonly',
        command: null,
      },
    }
    for (const sf of soundFiles) {
      const id = basename(basename(sf, '.mp3'), '.wav')
      expect(storeOperationMock.put).toHaveBeenCalledWith('soundMetadata', id, metadata[id])
      expect(storeOperationMock.put).toHaveBeenCalledWith('sound', id, { data: new Uint8Array() })
    }
  })
})

describe('useSoundMetadata', () => {
  test('Empty if no sound', async () => {
    const { result } = renderHook(() => useSoundMetadata('room', false))

    await waitFor(() => expect(result.current).toEqual([]))
  })

  test('No stored data', async () => {
    jest.mocked(getAll).mockResolvedValue([])
    const { result } = renderHook(() => useSoundMetadata('room', true))

    await waitFor(() => expect(result.current).toEqual([{}, {}]))
  })

  test('Load stored data', async () => {
    jest.mocked(getAll<unknown>).mockImplementation((_dbName, _storeName, receiver) => {
      const obj0 = receiver('id0', { displayName: 'd00', command: 'c00' })
      const obj1 = receiver('id1', { displayName: 'd01', command: ['c10', 'c11'] })
      const obj2 = receiver('id2', { displayName: 'd02', command: null })
      return Promise.resolve([obj0, obj1, obj2])
    })

    const { result } = renderHook(() => useSoundMetadata('room', true))

    await waitFor(() => expect(result.current).toEqual([
      {
        id0: { id: 'id0', displayName: 'd00', command: ['c00'] },
        id1: { id: 'id1', displayName: 'd01', command: ['c10', 'c11'] },
        id2: { id: 'id2', displayName: 'd02', command: ['id2'] },
      },
      {
        c00: 'id0', c10: 'id1', c11: 'id1', id2: 'id2'
      }
    ]))
  })

  test('Skip invalid data', async () => {
    jest.mocked(getAll<unknown>).mockImplementation((_dbName, _storeName, receiver) => {
      // obj1 is Invalid data
      const obj0 = receiver('id0', { displayName: 'd00' })
      const obj1 = receiver('id1', { displayName: 'd01', command: ['c10', 'c11'] })
      expect(obj0).toBeUndefined()
      return Promise.resolve([obj1])
    })

    const { result } = renderHook(() => useSoundMetadata('room', true))

    await waitFor(() => expect(result.current).toEqual([
      {
        id1: { id: 'id1', displayName: 'd01', command: ['c10', 'c11'] },
      },
      {
        c10: 'id1', c11: 'id1'
      }
    ]))
  })
})

describe('usePlaySound', () => {
  let audioContext: AudioContext
  let audioBufferSouce: AudioBufferSourceNode
  let gain: GainNode
  beforeEach(() => {
    global.AudioContext = jest.fn<() => AudioContext>()
    audioContext = new global.AudioContext()
    audioBufferSouce = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      addEventListener: jest.fn()
    } as any // eslint-disable-line @typescript-eslint/no-explicit-any
    audioContext.createBufferSource = jest.fn<typeof audioContext.createBufferSource>(() => audioBufferSouce)
    gain = {
      gain: {
        value: 0
      },
      connect: jest.fn(),
      disconnect: jest.fn(),
    } as any // eslint-disable-line @typescript-eslint/no-explicit-any
    audioContext.createGain = jest.fn<typeof audioContext.createGain>(() => gain)
    audioContext.decodeAudioData = jest.fn<typeof audioContext.decodeAudioData>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.mocked(global.AudioContext).mockImplementation((): any => audioContext)
  })

  test('No sound', async () => {
    jest.mocked(get).mockResolvedValue(null)
    const { result } = renderHook(() => usePlaySound('room'))
    const playSound = result.current
    const onFinish = jest.fn()

    playSound('id', 100, onFinish)

    await waitFor(() => expect(onFinish).toBeCalledWith(new Error('No sound data: id')))
  })

  test('Decode sound and play it', async () => {
    jest.mocked(get).mockResolvedValue({ data: new Uint8Array() })
    const { result } = renderHook(() => usePlaySound('room'))
    const playSound = result.current
    const onFinish = jest.fn()

    playSound('id', 100, onFinish)

    // Wait for decode
    await waitFor(() => expect(audioContext.decodeAudioData).toBeCalled())
    const decodeSuccess = jest.mocked(audioContext.decodeAudioData).mock.calls[0][1]
    assertNotNullable(decodeSuccess, 'decodeSuccess must be defined here.')

    // Play
    decodeSuccess({} as AudioBuffer)
    expect(audioBufferSouce.buffer).toEqual({}) // {}: Used just before
    expect(audioBufferSouce.connect).toBeCalled()
    expect(audioBufferSouce.loop).toBe(false)
    expect(audioBufferSouce.start).toBeCalledWith(0)
    expect(audioBufferSouce.addEventListener).toBeCalledWith('ended', expect.any(Function))

    // End
    const endedListener = jest.mocked(audioBufferSouce.addEventListener).mock.calls[0][1]
    if (typeof endedListener === 'object') {
      throw new Error('endedListener must be function.')
    }
    endedListener({} as Event)
    expect(audioBufferSouce.stop).toBeCalledWith(0)
    expect(audioBufferSouce.disconnect).toBeCalled()
    expect(gain.disconnect).toBeCalled()
    expect(onFinish).toBeCalledWith()
  })

  test('Decode failed', async () => {
    jest.mocked(get).mockResolvedValue({ data: new Uint8Array() })
    const { result } = renderHook(() => usePlaySound('room'))
    const playSound = result.current
    const onFinish = jest.fn()

    playSound('id', 100, onFinish)

    // Wait for decode
    await waitFor(() => expect(audioContext.decodeAudioData).toBeCalled())
    const decodeError = jest.mocked(audioContext.decodeAudioData).mock.calls[0][2]
    assertNotNullable(decodeError, 'decodeError must be defined here.')

    // Error handling
    const exception = new DOMException('test')
    decodeError(exception)
    expect(audioBufferSouce.stop).toBeCalledWith(0)
    expect(audioBufferSouce.disconnect).toBeCalled()
    expect(gain.disconnect).toBeCalled()
    expect(onFinish).toBeCalledWith(exception)
  })
})
