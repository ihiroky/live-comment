import { getLogger } from '@/common/Logger'

const DB_NAME_PREFIX = 'live-comment/'
const DB_VERSION = 1
const StoreNames = [
  'soundMetadata',
  'sound',
] as const
export type StoreName = typeof StoreNames[number]

const log = getLogger('sound/db')

function open(name: string): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>(
    (resolve: (req: IDBDatabase) => void, reject: (e: Error) => void): void => {
      const dbName = DB_NAME_PREFIX + name
      const req = indexedDB.open(dbName, DB_VERSION)
      req.addEventListener('upgradeneeded', function(this: IDBOpenDBRequest, e: IDBVersionChangeEvent): void {
        log.debug(this.result.version, e.oldVersion, e.newVersion)
        for (const name of StoreNames) {
          this.result.createObjectStore(name, { keyPath: 'id' })
        }
      })
      req.addEventListener('success', function(this: IDBOpenDBRequest): void {
        resolve(this.result)
      })
      req.addEventListener('error', function(): void {
        reject(new Error(`Failed to open database: ${dbName}`))
      })
    }
  )
}

export async function get<T>(dbName: string, storeName: StoreName, id: string): Promise<T | null> {
  const db = await open(dbName)
  return new Promise<T | null>((resolve: (checksum: T | null) => void, reject: (e: Error) => void): void => {
    const req = db.transaction([storeName], 'readonly').objectStore(storeName).get(id)
    if (!req) {
      resolve(null)
      return
    }
    req.addEventListener('success', function(): void {
      resolve(this.result?.value ?? null)
      db.close()
    })
    req.addEventListener('error', function(): void {
      reject(new Error('Failed to get ' + id))
      db.close()
    })
  })
}

export async function getAll<T>(
  dbName: string,
  storeName: StoreName,
  receiver: (id: string, value: unknown) => T | undefined
): Promise<T[]> {
  const db = await open(dbName)
  return new Promise<T[]>((resolve: (values: T[]) => void, reject: (e: unknown) => void): void => {
    const req = db.transaction([storeName], 'readonly').objectStore(storeName).openCursor()
    if (!req) {
      reject(new Error('Failed to open cursor.'))
      return
    }
    const values: T[] = []
    req.addEventListener('success', function(): void {
      const cursor = this.result
      if (!cursor) {
        log.debug('[getAll]', values)
        resolve(values)
        return
      }
      if (typeof cursor.key !== 'string') {
        reject(new Error('Unexpected key type: ' + typeof cursor.key))
        return
      }
      try {
        const value = receiver(cursor.key, cursor.value.value)
        log.debug('[reciever]', value)
        if (value !== undefined) {
          values.push(value)
        }
        cursor.continue()
      } catch (e: unknown) {
        reject(e)
      }
    })
  })
}

export type StoreOperation = {
  put(storeName: StoreName, id: string, value: unknown): void
  clear(storeName: StoreName): void
  transaction: {
    commit(): void
    abort(): void
  }
}

export async function update(
  dbName: string,
  storeNames: StoreName[],
  updater: (op: StoreOperation) => Promise<void>
): Promise<void> {
  const db = await open(dbName)
  const tx = db.transaction(storeNames, 'readwrite')
  const stores: Map<StoreName, IDBObjectStore> = new Map()
  for (const name of storeNames) {
    stores.set(name, tx.objectStore(name))
  }
  try {
    await updater({
      put: (storeName: StoreName, id: string, value: unknown): void => {
        const store = stores.get(storeName)
        if (!store) {
          throw new Error(`No object store: ${storeName}`)
        }
        store.put({ id, value })
      },
      clear: (storeName: StoreName): void => {
        const store = stores.get(storeName)
        if (!store) {
          throw new Error(`No object store: ${storeName}`)
        }
        store.clear()
      },
      transaction: {
        commit: () => tx.commit(),
        abort: () => tx.abort(),
      },
    })
    tx.commit()
  } catch (e: unknown) {
    tx.abort()
    throw e
  } finally {
    db.close()
  }
}
