import { FormControl, FormControlLabel, FormGroup, Switch } from '@mui/material'
import { ChangeEvent, StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getLogger } from '@/common/Logger'

const KEY_LOG_TAB_ID = 'lc.log.tab.id'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

const showLogWindow = async (_: ChangeEvent<HTMLInputElement>, checked: boolean): Promise<void> => {
  if (checked) {
    const options: chrome.windows.CreateData = {
      url: 'chrome-extension://' + chrome.runtime.id + '/comment/index.html',
    }
    const w = await chrome.windows.create(options)
    const tabId = w.tabs?.[0].id
    if (!tabId) {
      throw new Error('Failed to create log window')
    }
    chrome.windows.onRemoved.addListener((windowId: number): void => {
      if (windowId === w.id) {
        chrome.storage.local.remove(KEY_LOG_TAB_ID)
      }
    })
    chrome.storage.local.set({ [KEY_LOG_TAB_ID]: tabId })
  } else {
    const obj = await chrome.storage.local.get(KEY_LOG_TAB_ID)
    const tabId = obj[KEY_LOG_TAB_ID]
    if (tabId) {
      chrome.tabs.remove(tabId)
      chrome.storage.local.remove(KEY_LOG_TAB_ID)
    }
  }
}

const log = getLogger('popup')
const App = (): JSX.Element => {
  const [state, setState] = useState<boolean>(false)

  useEffect(() => {
    log.info('App: useEffect mount')
    return () => {
      log.info('App: useEffect unmount')
    }
  })

  useEffect((): void => {
    chrome.storage.local.get(KEY_LOG_TAB_ID).then(async obj => {
      const tabId = obj[KEY_LOG_TAB_ID]
      const tab = await chrome.tabs.get(tabId)
      if (tab && tab.id) {
        setState(true)
      }
    })
  }, [])

  return (
    <StrictMode>
      <FormControl component="fieldset" variant="standard">
        <FormGroup>
          <FormControlLabel control={
            <Switch checked={state} onChange={showLogWindow}/>
          } label="Display comments" />
        </FormGroup>
      </FormControl>
    </StrictMode>
  )
}
const root = createRoot(rootElement)
root.render(<App />)
