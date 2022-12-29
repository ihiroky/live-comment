import { store } from '../store'

export async function validatePopupWindows(s: typeof store): Promise<void> {
  const logTabId = s.cache.logTab.tabId
  if (logTabId) {
    await chrome.tabs.get(logTabId).catch(
      () => {
        s.delete('logTab')
      }
    )
  }
  const settingsTabId = s.cache.settingsTab.tabId
  if (settingsTabId) {
    await chrome.tabs.get(settingsTabId).catch(
      () => s.delete('settingsTab')
    )
  }
}
