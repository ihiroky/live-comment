import { createChromeStore, createWindowStore } from './store'
import { jest, describe } from '@jest/globals'

describe('WindowStore', () => {

  afterEach(() => {
    window.localStorage.clear()
  })

  test('Load initial values from storage', async () => {
    window.localStorage.setItem('k0', JSON.stringify({s: 's0', n: 123}))
    window.localStorage.setItem('k1', JSON.stringify('s1'))

    const store = createWindowStore<{
      k0: { s: string , n: number }
      k1: string
    }>(window.localStorage, {
      k0: { s: '', n: 0 },
      k1: ''
    })
    await store.sync()

    expect(store.cache).toEqual({
      k0: { s: 's0', n: 123 },
      k1: 's1',
    })
  })

  test('subscribe and update', async () => {
    const store = createWindowStore<{
      k0: { s: string , n: number }
      k1: string
    }>(window.localStorage, {
      k0: { s: '', n: 0 },
      k1: ''
    })
    await store.sync()

    const callback = jest.fn<() => void>()
    const unsubscribe = store.subscribe(callback)

    await store.update('k0', { s: 's00', n: 123 })
    expect(callback).toBeCalledTimes(1)
    expect(store.cache.k0).toEqual({ s: 's00', n: 123 })

    await store.update('k1', 'v10')
    expect(callback).toBeCalledTimes(2)
    expect(store.cache.k1).toBe('v10')

    unsubscribe()

    await store.update('k0', { s: 's01', n: 234 })
    expect(store.cache.k0).toEqual({ s: 's01', n: 234 })
    await store.update('k1', 'v11')
    expect(store.cache.k1).toBe('v11')
    expect(callback).toBeCalledTimes(2) // The same times as above.
  })

  test('independent key does not have an effect.', async () => {
    const store = createWindowStore<{
      k0: { s: string , n: number }
      k1: string
    }>(window.localStorage, {
      k0: { s: '', n: 0 },
      k1: ''
    })
    await store.sync()

    const callback = jest.fn<() => void>()
    store.subscribe(callback)

    window.localStorage.setItem('k2', 'v2')

    expect(callback).not.toBeCalled()
  })

  test('independent storage does not have an effect.', async () => {
    window.addEventListener = jest.fn<typeof window.addEventListener>()
    const store = createWindowStore<{
      k0: { s: string , n: number }
      k1: string
    }>(window.localStorage, {
      k0: { s: '', n: 0 },
      k1: ''
    })
    await store.sync()

    const callback = jest.fn<() => void>()
    store.subscribe(callback)

    const listener = jest.mocked(window.addEventListener).mock.calls[0][1]
    if (typeof listener !== 'function') {
      throw new Error()
    }
    listener(new StorageEvent('storage', {
      key: 'k0',
      newValue: '0',
      storageArea: window.sessionStorage,
    }))

    expect(callback).not.toBeCalled()
  })

  test('Clear cache if removed', async () => {
    const store = createWindowStore<{
      k0: { s: string , n: number }
      k1: string
    }>(window.localStorage, {
      k0: { s: '', n: 0 },
      k1: ''
    })
    await store.sync()

    await store.delete('k0')

    expect(store.cache.k0).toEqual({ s: '', n: 0 })
  })
})


describe('ChromeStore', () => {

  function createSetFunc(areaName: 'local' | 'session') {
    return (obj: Record<string, unknown>) => {
      return new Promise<void>(resolve => {
        const listener = jest.mocked(chrome.storage.onChanged.addListener).mock.calls[0][0]
        const changes = Object.entries(obj)
          .reduce<Record<string, chrome.storage.StorageChange>>((a, c) => {
            a[c[0]] = { newValue: c[1] }
            return a
          }, {})
        listener(changes, areaName)
        resolve()
      })
    }
  }

  function createRemoveFunc(areaName: 'local' | 'session') {
    return (keys: string[]) => {
      return new Promise<void>(resolve => {
        const listener = jest.mocked(chrome.storage.onChanged.addListener).mock.calls[0][0]
        const changes = keys
          .reduce<Record<string, chrome.storage.StorageChange>>((a, c) => {
            a[c] = {}
            return a
          }, {})
        listener(changes, areaName)
        resolve()
      })
    }
  }

  beforeEach(() => {
    global.chrome = {
      storage: {
        onChanged: {
          addListener: jest.fn(),
        },
        local: {
          set: jest.fn<(obj: Record<string, unknown>) => Promise<void>>(createSetFunc('local')),
          get: jest.fn<(keys: string[]) => Promise<Record<string, unknown>>>(() => Promise.resolve({})),
          remove: jest.fn<(keys: string[]) => Promise<void>>(createRemoveFunc('local')),
        },
        session: {
          set: jest.fn<(obj: Record<string, unknown>) => Promise<void>>(createSetFunc('session')),
          get: jest.fn<(keys: string[]) => Promise<Record<string, unknown>>>(() => Promise.resolve({})),
          remove: jest.fn<(keys: string[]) => Promise<void>>(createRemoveFunc('session')),
        },
      },
    } as any  // eslint-disable-line @typescript-eslint/no-explicit-any
  })

  test('Load initial values from storage', async () => {
    jest.mocked(chrome.storage.local.get).mockImplementation((k) => {
      return new Promise((resolve: (r: Record<string, unknown>) => void, reject: (reason: Error) => void) => {
        if (!Array.isArray(k)) {
          reject(new Error(`Unexpected key: ${k}`))
          return
        }
        const ret = k.reduce<Record<string, unknown>>((a, c) => {
          if (c === 'k0') {
            a[c] = { s: 's0', n: 123 }
          } else if (c === 'k1') {
            a[c] = 's1'
          } else {
            throw new Error(`UNexpected key: ${c}`)
          }
          return a
        }, {})
        resolve(ret)
      })
    })

    const store = createChromeStore<{
      k0: { s: string , n: number }
      k1: string
    }>(chrome.storage.local, {
      k0: { s: '', n: 0 },
      k1: ''
    })
    await store.sync()

    expect(store.cache).toEqual({
      k0: { s: 's0', n: 123 },
      k1: 's1',
    })
  })

  test('subscribe and update', async () => {
    const store = createChromeStore<{
      k0: { s: string , n: number }
      k1: string
    }>(chrome.storage.local, {
      k0: { s: '', n: 0 },
      k1: ''
    })
    await store.sync()

    const callback = jest.fn<() => void>()
    const unsubscribe = store.subscribe(callback)

    await store.update('k0', { s: 's00', n: 123 })
    expect(callback).toBeCalledTimes(1)
    expect(store.cache.k0).toEqual({ s: 's00', n: 123 })

    await store.update('k1', 'v10')
    expect(callback).toBeCalledTimes(2)
    expect(store.cache.k1).toBe('v10')

    unsubscribe()

    await store.update('k0', { s: 's01', n: 234 })
    expect(store.cache.k0).toEqual({ s: 's01', n: 234 })
    await store.update('k1', 'v11')
    expect(store.cache.k1).toBe('v11')
    expect(callback).toBeCalledTimes(2) // The same times as above.
  })

  test('independent key does not have an effect.', async () => {
    const store = createChromeStore<{
      k0: { s: string , n: number }
      k1: string
    }>(chrome.storage.local, {
      k0: { s: '', n: 0 },
      k1: ''
    })
    await store.sync()

    const callback = jest.fn<() => void>()
    store.subscribe(callback)

    await chrome.storage.local.set({ k2: 'v2' })

    expect(callback).not.toBeCalled()
  })

  test('independent storage does not have an effect.', async () => {
    // Assume that window.dispatchEvent is invoked on sessionStorage.
    const store = createChromeStore<{
      k0: { s: string , n: number }
      k1: string
    }>(chrome.storage.local, {
      k0: { s: '', n: 0 },
      k1: ''
    })
    await store.sync()

    const callback = jest.fn<() => void>()
    store.subscribe(callback)

    await chrome.storage.session.set({ k0: 'v00', k1: 'v10' })

    expect(callback).not.toBeCalled()
  })

  test('Clear cache if removed', async () => {
    const store = createChromeStore<{
      k0: { s: string , n: number }
      k1: string
    }>(chrome.storage.local, {
      k0: { s: '', n: 0 },
      k1: ''
    })
    await store.sync()

    await chrome.storage.local.set({ k0: 'v0' })
    await chrome.storage.local.remove(['k0'])

    expect(store.cache.k0).toEqual({ s: '', n: 0 })
  })
})
