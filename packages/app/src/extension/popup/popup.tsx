import { ChangeEvent, StrictMode, useCallback, useEffect, useSyncExternalStore, useState } from 'react'
import { FormControl, FormControlLabel, FormGroup, Switch } from '@mui/material'
import makeStyles from '@mui/styles/makeStyles'
import { createRoot } from 'react-dom/client'
import { getLogger } from '@/common/Logger'
import { TargetTab } from '../types'
import { logWindowStore, commentsShownTabIdStore } from '../stores'


const log = getLogger('popup')

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
