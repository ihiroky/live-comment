import { ChangeEvent, StrictMode, useCallback, useEffect, useSyncExternalStore, useState } from 'react'
import { Divider, FormControl, FormControlLabel, FormGroup, Switch, Typography } from '@mui/material'
import { createRoot } from 'react-dom/client'
import { getLogger } from '@/common/Logger'
import { TargetTab } from '../types'
import { store } from '../store'

const log = getLogger('popup')

function createOnLogTabRemoved(logTabId: number): ((tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => void) {
  const listener = (tabId: number): void => {
    if (tabId === logTabId) {
      store.update('logTab', { tabId: 0 })
      //logWindowStore.update({ tabId: 0 })
      chrome.tabs.onRemoved.removeListener(listener)
    }
  }
  return listener
}

async function showLogWindow(): Promise<void> {
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
  await store.update('showCommentTabs', { tabIds: {} })
  const w = await chrome.windows.create(options)
  const tab = w.tabs?.[0]
  if (!tab || !tab.id) {
    throw new Error('Failed to create log window')
  }

  await store.update('logTab', { tabId: tab.id })
  //logWindowStore.update({ tabId })
  const listener = createOnLogTabRemoved(tab.id)
  chrome.tabs.onRemoved.addListener(listener)
  if (tab.status !== 'complete') {
    return new Promise<void>(resolve => {
      const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo): void => {
        if (tabId !== tab.id) {
          return
        }
        if (changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener)
          log.debug('Tab status gets complete:', tabId)
          resolve()
        }
      }
      chrome.tabs.onUpdated.addListener(listener)
      setTimeout((): void => {
        chrome.tabs.onUpdated.removeListener(listener)
        log.debug('No status change found for tab', tab.id, tab.status)
        resolve()
      }, 1000)
    })
  }

}

async function closeLogWindow(): Promise<void> {
  const tabId = store.cache.logTab.tabId
  //const tabId = logWindowStore.cache.tabId
  if (tabId) {
    await store.update('logTab', { tabId: 0 })
    //logWindowStore.update({ tabId: 0 })
    const tab = await chrome.tabs.get(tabId)
    if (tab && tab.id) {
      await chrome.tabs.remove(tabId)
    }
  }
  // logWindowStore is cleanup by chrome.tabs.onRemoved.
}

async function toggleCommentsOnTab(logWindowShown: boolean, showOnTab: boolean, currentTabId: number): Promise<void> {
  if (!logWindowShown && showOnTab) {
    return
  }
  if (!currentTabId) {
    return
  }

  const newTabIds: Record<number, true> = { ...store.cache.showCommentTabs.tabIds }
  //const newTabIds: Record<number, true> = { ...commentsShownTabIdStore.cache.tabIds }
  if (showOnTab) {
    newTabIds[currentTabId] = true
  } else {
    delete newTabIds[currentTabId]
  }
  await store.update('showCommentTabs', { tabIds: newTabIds })
  //commentsShownTabIdStore.update({ tabIds: newTabIds })

  const message: TargetTab = {
    type: 'target-tab',
    tabId: currentTabId,
    status: showOnTab ? 'added' : 'removed'
  }
  chrome.tabs.sendMessage(currentTabId, message)
}

const App = (): JSX.Element => {
  const [currentTabId, setCurrentTabId] = useState<number>(0)
  const storeCache = useSyncExternalStore(store.subscribe, () => store.cache)
  const logWindowShown = !!storeCache.logTab.tabId
  const commentsShownTabIds = storeCache.showCommentTabs.tabIds

  log.info(logWindowShown, currentTabId, commentsShownTabIds)

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
        const tabId = store.cache.logTab.tabId
        //const tabId = logWindowStore.cache.tabId
        if (tabId) {
          chrome.tabs.get(tabId)
            .catch(() => null)
            .then((tab: chrome.tabs.Tab | null): void => {
              if (tab && tab.id) {
                const listener = createOnLogTabRemoved(tab.id)
                chrome.tabs.onRemoved.addListener(listener)
              } else {
                store.update('logTab', { tabId: 0 })
                //logWindowStore.update({ tabId: 0 })
                //showCommentsOn(currentTabId, false)
                toggleCommentsOnTab(true, false, currentTabId)
              }
            })
        } else {
          //showCommentsOn(currentTabId, false)
          toggleCommentsOnTab(true, false, currentTabId)
        }
      })

    return (): void => {
      log.info('App: useEffect unmount')
    }
  }, [])

  const toggleShowComments = useCallback((_: ChangeEvent<HTMLInputElement>, checked: boolean): void => {
    toggleCommentsOnTab(logWindowShown, checked, currentTabId)
  }, [logWindowShown, currentTabId])
  const toggleLogWindow = useCallback((_: ChangeEvent<HTMLInputElement>, checked: boolean): void => {
    if (checked) {
      showLogWindow().then((): void => {
        if (storeCache.aggressive) {
          toggleCommentsOnTab(true, true, currentTabId)
        }
      })
    } else {
      toggleCommentsOnTab(true, false, currentTabId).then((): void => {
        closeLogWindow()
      })
      //showCommentsOn(currentTabId, false)
    }
  }, [currentTabId, storeCache.aggressive])
  const toggleAggressiveMode = useCallback((_: ChangeEvent<HTMLInputElement>, checked: boolean): void => {
    store.update('aggressive', checked)
  }, [])

  return (
    <StrictMode>
      <FormControl component="fieldset" variant="standard">
        <FormGroup>
          <FormControlLabel control={
            <Switch checked={logWindowShown} onChange={toggleLogWindow} />
          } label={<Typography variant="body1">Feed comments</Typography>} />
          <Divider />
          <FormControlLabel control={
            <Switch checked={commentsShownTabIds[currentTabId] ?? false} onChange={toggleShowComments} />
          } label={<Typography variant="body2">In this tab</Typography>} />
          <FormControlLabel control={
            <Switch checked={storeCache.aggressive} onChange={toggleAggressiveMode} />
          } label={<Typography variant="body2">As soon as a tab opens</Typography>} />
        </FormGroup>
      </FormControl>
    </StrictMode>
  )
}

async function main(): Promise<void> {
  await store.sync()

  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }
  const root = createRoot(rootElement)
  root.render(<App />)
}

main()