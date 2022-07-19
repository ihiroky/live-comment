import { getLogger } from './Logger'

const log = getLogger('store')

type Key = string | number | symbol

function createIsKey<K extends string>(keys: Key[]): (k: Key | null) => k is K {
  const keySet = new Set<Key>(keys.map(k => k.toString()))
  return (k: Key | null): k is K => {
    return k !== null && keySet.has(k)
  }
}

type StoreObj<T extends Record<string, unknown>> = {
  _cache: T
  _callbacks: Array<() => void>
  get cache(): Readonly<T>
  subscribe: (callback: () => void) => (() => void)
  update: <K extends keyof T>(key: K, value: T[K]) => Promise<void>
  sync: () => Promise<void>
}

function createStoreBase<T extends Record<string, unknown>>(): StoreObj<T> {
  const store = {
    _cache: {} as T,
    _callbacks: new Array<() => void>(),

    get cache(): Readonly<T> {
      return store._cache
    },
    subscribe: (callback: () => void): (() => void) => {
      store._callbacks.push(callback)
      return (): void => {
        const i = store._callbacks.indexOf(callback)
        if (i > -1) {
          store._callbacks.splice(i, 1)
        }
      }
    },
    update: () => Promise.reject(new Error('Unimplemented: StoreObj.update()')),
    sync: () => Promise.reject(new Error('Unimplemented: StoreObj.sync()')),
  }
  return store
}

export function createWindowStore<T extends Record<string, unknown>>(
  storage: Storage,
  empty: T
): StoreObj<T> {
  const store = createStoreBase<T>()
  store.update = <K extends keyof T>(key: K, value: T[K]): Promise<void> => {
    return new Promise<void>(resolve => {
      const s = JSON.stringify(value)
      storage.setItem(key.toString(), s)
      resolve()
    })
  }

  const keys = Object.keys(empty)
  const syncPromise = new Promise<void>(resolve => {
    for (const key of keys) {
      const s = storage.getItem(key.toString())
      store._cache[key as (keyof T)] = (s !== null) ? JSON.parse(s) : empty[key]
    }
    resolve()
  })
  store.sync = (): Promise<void> => syncPromise

  const isKey = createIsKey(keys)
  const listener = (ev: WindowEventMap['storage']): void => {
    if (!isKey(ev.key)) {
      return
    }
    if (ev.storageArea !== storage) {
      return
    }
    store._cache = {
      ...store._cache,
      [ev.key]: (ev.newValue !== null) ? JSON.parse(ev.newValue) : empty[ev.key]
    }
    store._callbacks.forEach(f => f())
  }
  window.addEventListener('storage', listener)

  return store
}

type AreaName = keyof Pick<typeof chrome.storage, 'sync' | 'local' | 'managed' | 'session'>

export function createChromeStore<T extends Record<string, unknown>>(
  storage: chrome.storage.StorageArea,
  empty: T
): StoreObj<T> {
  const store = createStoreBase<T>()
  store.update = <K extends keyof T>(key: K, value: T[K]): Promise<void> => {
    return storage.set({
      [key]: value
    })
  }

  const keys = Object.keys(empty)
  const syncPromise = storage.get(keys).then(values => {
    for (const k of keys) {
      const value = values[k.toString()]
      store._cache = {
        ...store._cache,
        [k]: (value !== undefined) ? value : empty[k]
      }
    }
  })
  store.sync = (): Promise<void> => syncPromise

  const isKey = createIsKey(keys)
  const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: AreaName): void => {
    log.info('CALL listner', changes, areaName)
    if (chrome.storage[areaName] !== storage) {
      return
    }
    let updated = false
    for (const entry of Object.entries(changes)) {
      const k = entry[0]
      if (!isKey(k)) {
        continue
      }
      const newValue = entry[1].newValue
      store._cache = {
        ...store._cache,
        [k]: (newValue !== undefined) ? newValue : empty[k]
      }
      updated = true
    }
    if (updated) {
      store._callbacks.forEach(f => f())
    }
  }
  chrome.storage.onChanged.addListener(listener)

  return store
}
