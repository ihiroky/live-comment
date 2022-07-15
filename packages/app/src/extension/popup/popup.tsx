import { ChangeEvent, StrictMode, useCallback, useEffect, useSyncExternalStore, useState } from 'react'
import { FormControl, FormControlLabel, FormGroup, Switch } from '@mui/material'
import makeStyles from '@mui/styles/makeStyles'
import { createRoot } from 'react-dom/client'
import { getLogger } from '@/common/Logger'
import { isObject } from '@/common/utils'
import { TargetTab } from '../types'

const KEY_LOG_TAB_ID = 'lc.log-tab.id'
const KEY_SHOWN_COMMENTS_TAB_IDS = 'lc.shown-comemnts-tab.ids'

const log = getLogger('popup')

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

const logWindowStore: StoreImpl<LogWindowStoreValues> = {
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

const commentsShownTabIdStore: StoreImpl<CommentsShownTabIdsStoreValues> = {
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

function createOnLogTabRemoved(logTabId: number): ((tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => void) {
  const listener = (tabId: number): void => {
    if (tabId === logTabId) {
      logWindowStore.update({ tabId: 0 })
      chrome.tabs.onRemoved.removeListener(listener)
    }
  }
  return listener
}

async function showLogWindow(): Promise<void> {
  const width = 800
  const height = 600
  const options: chrome.windows.CreateData = {
    type: 'panel',
    url: 'chrome-extension://' + chrome.runtime.id + '/popup/comment.html',
    top: window.screen.availHeight - height,
    left: window.screen.availWidth - width,
    width,
    height,
  }
  const w = await chrome.windows.create(options)
  const tabId = w.tabs?.[0].id
  if (!tabId) {
    throw new Error('Failed to create log window')
  }

  logWindowStore.update({ tabId })
  const listener = createOnLogTabRemoved(tabId)
  chrome.tabs.onRemoved.addListener(listener)
}

async function closeLogWindow(): Promise<void> {
  const tabId = logWindowStore.cache.tabId
  if (tabId) {
    logWindowStore.update({ tabId: 0 })
    const tab = await chrome.tabs.get(tabId)
    if (tab && tab.id) {
      await chrome.tabs.remove(tabId)
    }
  }
  // logWindowStore is cleanup by chrome.tabs.onRemoved.
}

const useStyles = makeStyles({
  App: {
    backgroundColor: '#ccffcc',
  },
})

function showCommentsOn(currentTabId: number, checked: boolean): void {
  if (!currentTabId) {
    return
  }

  const newTabIds: Record<number, true> = { ...commentsShownTabIdStore.cache.tabIds }
  if (checked) {
    newTabIds[currentTabId] = true
  } else {
    delete newTabIds[currentTabId]
  }
  commentsShownTabIdStore.update({ tabIds: newTabIds })

  const message: TargetTab = {
    type: 'target-tab',
    tabId: currentTabId,
    status: checked ? 'added' : 'removed'
  }
  chrome.tabs.sendMessage(currentTabId, message)

  // tab URL変わったときにaddedを送ることができるようにタブにリスナーを仕掛ける
}

const App = (): JSX.Element => {
  const [currentTabId, setCurrentTabId] = useState<number>(0)
  const logWindowShown = useSyncExternalStore(logWindowStore.subscribe, () => !!logWindowStore.cache.tabId)
  const commentsShownTabIds = useSyncExternalStore(
    commentsShownTabIdStore.subscribe,
    () => commentsShownTabIdStore.cache.tabIds
  )
  log.info(logWindowShown, currentTabId, commentsShownTabIds)

  const style = useStyles()

  useEffect((): (() => void) => {
    log.info('App: useEffect mount')
    chrome.windows.getCurrent()
      .then((window: chrome.windows.Window): Promise<chrome.tabs.Tab[]> => {
        return chrome.tabs.query({ active: true, windowId: window.id })
      })
      .then((tabs: chrome.tabs.Tab[]): number => {
        if (tabs && tabs[0] && tabs[0].id) {
          setCurrentTabId(tabs[0].id)
          return tabs[0].id
        }
        return 0
      })
      .then((currentTabId: number): void => {
        if (logWindowStore.cache.tabId) {
          chrome.tabs.get(logWindowStore.cache.tabId)
            .catch(() => null)
            .then((tab: chrome.tabs.Tab | null): void => {
              if (tab && tab.id) {
                const listener = createOnLogTabRemoved(tab.id)
                chrome.tabs.onRemoved.addListener(listener)
              } else {
                logWindowStore.update({ tabId: 0 })
                showCommentsOn(currentTabId, false)
              }
            })
        } else {
          showCommentsOn(currentTabId, false)
        }
      })

    return (): void => {
      log.info('App: useEffect unmount')
    }
  }, [])

  const toggleShowComments = useCallback((_: ChangeEvent<HTMLInputElement>, checked: boolean): void => {
    if (!logWindowShown && checked) {
      return
    }

    const newTabIds: Record<number, true> = { ...commentsShownTabIdStore.cache.tabIds }
    if (checked) {
      newTabIds[currentTabId] = true
    } else {
      delete newTabIds[currentTabId]
    }
    commentsShownTabIdStore.update({ tabIds: newTabIds })

    const message: TargetTab = {
      type: 'target-tab',
      tabId: currentTabId,
      status: checked ? 'added' : 'removed'
    }
    chrome.tabs.sendMessage(currentTabId, message)
  }, [logWindowShown, currentTabId])
  const toggleLogWindow = useCallback((_: ChangeEvent<HTMLInputElement>, checked: boolean): void => {
    if (checked) {
      showLogWindow()
    } else {
      closeLogWindow()
      showCommentsOn(currentTabId, false)
    }
  }, [currentTabId])

  return (
    <StrictMode>
      <FormControl className={style.App} component="fieldset" variant="standard">
        <FormGroup>
          <FormControlLabel control={
            <Switch checked={logWindowShown} onChange={toggleLogWindow}/>
          } label="ON" />
          <FormControlLabel control={
            <Switch checked={commentsShownTabIds[currentTabId] ?? false} onChange={toggleShowComments} />
          } label="Show" />
        </FormGroup>
      </FormControl>
    </StrictMode>
  )
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}
const root = createRoot(rootElement)
root.render(<App />)
