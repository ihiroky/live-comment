import { isObject } from '@/common/utils'

const KEY_LOG_TAB_ID = 'lc.log-tab.id'
const KEY_SHOWN_COMMENTS_TAB_IDS = 'lc.shown-comemnts-tab.ids'

type Store<T> = {
  get cache(): Readonly<T>
  subscribe: (callback: () => void) => (() => void)
  update: (values: T) => Promise<void>
}

type StoreImpl<T> = Store<T> & {
  _cache: T
}

type LogWindowStoreValues = {
  tabId: number
}

function isLogWindowStoreValues(v: unknown): v is LogWindowStoreValues {
  return isObject(v) && typeof v.tabId === 'number'
}

export const logWindowStore: StoreImpl<LogWindowStoreValues> = {
  _cache: {
    tabId: 0,
  },

  get cache(): Readonly<LogWindowStoreValues> {
    return logWindowStore._cache
  },

  subscribe: (callback: () => void): () => void => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string): void => {
      if (areaName !== 'local') {
        return
      }
      const change = changes[KEY_LOG_TAB_ID]
      if (!change) {
        return
      }
      logWindowStore._cache = isLogWindowStoreValues(change.newValue) ? change.newValue : { tabId: 0 }
      callback()
    }
    chrome.storage.onChanged.addListener(listener)

    // Check current state.
    chrome.storage.local.get(KEY_LOG_TAB_ID).then((store) => {
      const values = store[KEY_LOG_TAB_ID]
      if (isLogWindowStoreValues(values)) {
        if (values.tabId) {
          chrome.tabs.get(values.tabId)
            .catch(() => null)
            .then((tab: chrome.tabs.Tab | null): void => {
              if (tab && tab.id) {
                logWindowStore._cache = values
                callback()
              }
            })
        }
      }
    })

    return (): void => {
      chrome.storage.onChanged.removeListener(listener)
    }
  },

  update: (values: LogWindowStoreValues): Promise<void> => {
    return chrome.storage.local.set({
      [KEY_LOG_TAB_ID]: { ...values }
    })
  },
}

type CommentsShownTabIdsStoreValues = {
  tabIds: Record<number, true>
}

function isCommentsShowTabIdsStoreValues(v: unknown): v is CommentsShownTabIdsStoreValues {
  return isObject(v) && isObject(v.tabIds)
}

export const commentsShownTabIdStore: StoreImpl<CommentsShownTabIdsStoreValues> = {
  _cache: {
    tabIds: {},
  },

  get cache(): Readonly<CommentsShownTabIdsStoreValues> {
    return commentsShownTabIdStore._cache
  },

  subscribe: (callback: () => void): (() => void) => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string): void => {
      if (areaName !== 'local') {
        return
      }
      const change = changes[KEY_SHOWN_COMMENTS_TAB_IDS]
      if (!change) {
        return
      }
      commentsShownTabIdStore._cache = isCommentsShowTabIdsStoreValues(change.newValue)
        ? change.newValue
        : { tabIds: {} }
      callback()
    }
    chrome.storage.onChanged.addListener(listener)

    chrome.storage.local.get(KEY_SHOWN_COMMENTS_TAB_IDS).then(store => {
      const values = store[KEY_SHOWN_COMMENTS_TAB_IDS]
      if (isCommentsShowTabIdsStoreValues(values)) {
        commentsShownTabIdStore._cache = values
        callback()
      }
    })

    return (): void => {
      chrome.storage.onChanged.removeListener(listener)
    }
  },

  update(values: CommentsShownTabIdsStoreValues): Promise<void> {
    return chrome.storage.local.set({
      [KEY_SHOWN_COMMENTS_TAB_IDS]: { ...values }
    })
  }
}
