import { ChangeEvent, StrictMode, useCallback, useEffect, useSyncExternalStore } from 'react'
import { Button, Divider, FormControl, FormControlLabel, FormGroup, Switch, Typography } from '@mui/material'
import { getLogger } from '@/common/Logger'
import { LogWindowEvent, TargetTab } from '../types'
import { StoreType } from '../store'

const log = getLogger('popup')

async function showLogWindow(store: StoreType): Promise<void> {

  await store.update('showCommentTabs', { tabIds: {} })

  const logWindow = await new Promise(
    (
      resolve: (w: chrome.windows.Window) => void,
      reject: (e: Error) => void
    ): void => {
      let logWindow: chrome.windows.Window | undefined = undefined
      let commentOpenArrived = false
      let commentOpenTimeout = 0

      const listener = (m: LogWindowEvent): void => {
        if (m.type !== 'log-window-event') {
          return
        }
        if (m.status !== 'open') {
          return
        }
        log.info('[PopupApp] Receive', m)
        if (logWindow) {
          resolve(logWindow)
        }
        commentOpenArrived = true
        window.clearTimeout(commentOpenTimeout)
        chrome.runtime.onMessage.removeListener(listener)
      }
      chrome.runtime.onMessage.addListener(listener)

      commentOpenTimeout = window.setTimeout(() => {
        reject(new Error('CommentOpenEvent: timeout'))
      }, 3000)

      const width = 800
      const height = 800
      const options: chrome.windows.CreateData = {
        type: 'panel',
        url: 'chrome-extension://' + chrome.runtime.id + '/popup/comment.html',
        top: window.screen.availHeight - height,
        left: window.screen.availWidth - width,
        width,
        height,
      }
      chrome.windows.create(options).then((w: chrome.windows.Window): void => {
        if (!commentOpenArrived) {
          logWindow = w
        } else {
          resolve(w)
          window.clearTimeout(commentOpenTimeout)
        }
      })
    }
  )

  const tab = logWindow.tabs?.[0]
  if (!tab || !tab.id) {
    throw new Error('Failed to create log window')
  }

  await store.update('logTab', { tabId: tab.id })
}

async function closeLogWindow(store: StoreType): Promise<void> {
  const tabId = store.cache.logTab.tabId
  if (tabId) {
    const tab = await chrome.tabs.get(tabId)
    if (tab && tab.id) {
      await chrome.tabs.remove(tabId)
    }
  }
  // logTab and showCommentTabs are cleanup by chrome.tabs.onRemoved. See background.ts
}

async function toggleCommentsOnTab(
  store: StoreType,
  logWindowShown: boolean,
  showOnTab: boolean,
  targetTabId: number
): Promise<void> {
  if (!logWindowShown && showOnTab) {
    return
  }
  if (!targetTabId) {
    return
  }

  const newTabIds: Record<number, true> = { ...store.cache.showCommentTabs.tabIds }
  if (showOnTab) {
    newTabIds[targetTabId] = true
  } else {
    delete newTabIds[targetTabId]
  }
  await store.update('showCommentTabs', { tabIds: newTabIds })

  const message: TargetTab = {
    type: 'target-tab',
    tabId: targetTabId,
    status: showOnTab ? 'added' : 'removed'
  }
  chrome.tabs.sendMessage(targetTabId, message)
}

async function showSettingsWindow(store: StoreType): Promise<void> {
  // TODO check if the tab opens
  if (store.cache.settingsTab.tabId) {
    return
  }

  const width = 600
  const height = 700
  const options: chrome.windows.CreateData = {
    type: 'panel',
    url: 'chrome-extension://' + chrome.runtime.id + '/popup/settings.html',
    top: window.screen.availHeight - height,
    left: window.screen.availWidth - width,
    width,
    height,
  }
  const w = await chrome.windows.create(options)
  store.update('settingsTab', {
    ...store.cache.settingsTab,
    tabId: w.tabs?.[0].id || 0
  })

  // settingsTabs are cleanup by chrome.tabs.onRemoved. See background.ts
}

type Props = {
  store: StoreType
  currentTabId: number
}
export const App = ({ store, currentTabId }: Props): JSX.Element => {
  const storeCache = useSyncExternalStore(store.subscribe, () => store.cache)
  const logWindowShown = !!storeCache.logTab.tabId
  const commentsShownTabIds = storeCache.showCommentTabs.tabIds

  log.info(logWindowShown, currentTabId, commentsShownTabIds)

  useEffect((): (() => void) => {
    log.info('App: useEffect mount')

    return (): void => {
      log.info('App: useEffect unmount')
    }
  }, [])

  const toggleShowComments = useCallback((_: ChangeEvent<HTMLInputElement>, checked: boolean): void => {
    toggleCommentsOnTab(store, logWindowShown, checked, currentTabId)
  }, [store, logWindowShown, currentTabId])
  const toggleLogWindow = useCallback((_: ChangeEvent<HTMLInputElement>, checked: boolean): void => {
    if (checked) {
      showLogWindow(store).then((): void => {
        if (storeCache.aggressive) {
          toggleCommentsOnTab(store, true, true, currentTabId)
        }
      })
    } else {
      closeLogWindow(store)
    }
  }, [store, currentTabId, storeCache.aggressive])
  const toggleAggressiveMode = useCallback((_: ChangeEvent<HTMLInputElement>, checked: boolean): void => {
    store.update('aggressive', checked)
  }, [store])
  const showSettings = useCallback((): void => {
    showSettingsWindow(store)
  }, [store])

  return (
    <StrictMode>
      <FormControl component="fieldset" variant="standard">
        <FormGroup>
          <FormControlLabel control={
            <Switch checked={logWindowShown} onChange={toggleLogWindow} />
          } label={<Typography variant="body1">Feed/Post comments</Typography>} />
          <Divider />
          <FormControlLabel control={
            <Switch checked={commentsShownTabIds[currentTabId] ?? false} onChange={toggleShowComments} />
          } label={<Typography variant="body1">Show comments in this tab</Typography>} />
          <Divider />
          <FormControlLabel control={
            <Switch checked={storeCache.aggressive} onChange={toggleAggressiveMode} />
          } label={<Typography variant="body2">Show comments as soon as a tab opens</Typography>} />
          <Button variant="contained" sx={{width: 'fit-content', margin: 'auto'}} onClick={showSettings}>
            Settings
          </Button>
        </FormGroup>
      </FormControl>
    </StrictMode>
  )
}