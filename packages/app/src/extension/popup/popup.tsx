import { createRoot } from 'react-dom/client'
import { store } from '../store'
import { App } from './PopupApp'

;(async function(): Promise<void> {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }
  await store.sync()
  const window = await chrome.windows.getCurrent()
  const tabs = await chrome.tabs.query({ active: true, windowId: window.id })
  if (tabs && tabs[0] && tabs[0].id) {
    const root = createRoot(rootElement)
    root.render(<App store={store} currentTabId={tabs[0].id} />)
  }
})()
