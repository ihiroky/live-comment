import { fetchWithTimeout } from '@/common/utils'
import { getLogger } from '@/common/Logger'

const log = getLogger('serverConfigStore')

export const serverConfigStore = {
  snapshot: {
    samlEnabled: false,
  },
  callbacks: new Array<() => void>(),

  update: (apiUrl: string): Promise<void> => {
    return fetchWithTimeout(`${apiUrl}/saml/metadata`, {
      mode: 'cors',
      method: 'HEAD'
    }, 3000).then((res: Response): void => {
      serverConfigStore.snapshot = {
        samlEnabled: res.ok
      }
      serverConfigStore.callbacks.forEach(c => c())
    }).catch((e: unknown): void => {
      log.error('Failed to fetch saml metadata', e)
      serverConfigStore.snapshot = {
        samlEnabled: false
      }
      serverConfigStore.callbacks.forEach(c => c())
    })
  },
  subscribe: (callback: () => void): () => void => {
    serverConfigStore.callbacks = [...serverConfigStore.callbacks, callback]
    return (): void => {
      serverConfigStore.callbacks = serverConfigStore.callbacks.filter(l => l !== callback)
    }
  },
  getSnapshot: () => {
    return serverConfigStore.snapshot
  }
}
