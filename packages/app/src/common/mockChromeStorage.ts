import { jest } from '@jest/globals'

export function mockChromeStorage(): void {
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

  global.chrome = global.chrome ?? {}
  global.chrome = {
    ...global.chrome,
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
}