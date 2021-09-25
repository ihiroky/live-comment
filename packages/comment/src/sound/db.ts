import { getLogger } from 'common'
const DB_NAME = 'live-comment'
const DB_VERSION = 1
const STORE_NAME = 'sound'

const log = getLogger('sound/db')

function open(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>(
    (resolve: (req: IDBDatabase) => void, reject: (e: Error) => void): void => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.addEventListener('upgradeneeded', function(this: IDBOpenDBRequest, e: IDBVersionChangeEvent): void {
        log.debug(this.result.version, e.oldVersion, e.newVersion)
        this.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
      })
      req.addEventListener('success', function(this: IDBOpenDBRequest): void {
        resolve(this.result)
      })
      req.addEventListener('error', function(): void {
        reject(new Error(`Failed to open database: ${DB_NAME}`))
      })
    }
  )
}

export async function get<T>(id: string): Promise<T | null> {
  const db = await open()
  return new Promise<T | null>((resolve: (checksum: T | null) => void, reject: (e: Error) => void): void => {
    const req = db.transaction([STORE_NAME], 'readonly').objectStore(STORE_NAME).get(id)
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

export async function getAll<T>(receiver: (id: string, value: unknown) => T | undefined): Promise<T[]> {
  const db = await open()
  return new Promise<T[]>((resolve: (values: T[]) => void, reject: (e: unknown) => void): void => {
    const req = db.transaction([STORE_NAME], 'readonly').objectStore(STORE_NAME).openCursor()
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

export type Store = {
  put(id: string, value: unknown): void
  clear(): void
  transaction: {
    commit(): void
    abort(): void
  }
}

export async function update(updater: (store: Store) => void): Promise<void> {
  const db = await open()
  const tx = db.transaction([STORE_NAME], 'readwrite')
  const os = tx.objectStore(STORE_NAME)
  try {
    updater({
      put: (id: string, value: unknown): void => { os.put({ id, value }) },
      clear: (): void => { os.clear() },
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
