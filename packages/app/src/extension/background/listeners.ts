import { getLogger } from '@/common/Logger'
import { store } from '../store'
import { TargetTab } from '../types'

const log = getLogger('background')

function canShowComments(tabId: number): boolean {
  // Can't show comments if log window is not open.
  if (!store.cache.logTab.tabId) {
    return false
  }

  // Can show comments if show switch is ON in non agressive mode.
  const tabIds = store.cache.showCommentTabs.tabIds
  const ok = tabIds[tabId]
  if (!store.cache.aggressive) {
    return ok
  }

  // Show comments forcibly in agressive mode.
  if (!ok) {
    const newTabIds: Record<number, true> = {
      ...tabIds,
      [tabId]: true,
    }
    store.update('showCommentTabs', { tabIds: newTabIds })
  }
  return true
}

export const checkTargetTabStatus = (message: TargetTab, sender: chrome.runtime.MessageSender): void => {
  log.debug('[checkTargetTabStatus]', message, sender)
  if (message.type !== 'target-tab') {
    return
  }
  const tabId = sender.tab?.id
  if (!tabId) {
    return
  }

  const status = canShowComments(tabId) ? 'added' : undefined
  const response: TargetTab = {
    type: 'target-tab',
    status,
    tabId,
  }
  log.info('SEND', tabId, response)
  chrome.tabs.sendMessage(tabId, response)
}

export const cleanUpExtensionTabs = (tabId: number): void => {
  log.debug('[cleanupExtensionTab]', tabId)
  if (tabId === store.cache.logTab.tabId) {
    Object.keys(store.cache.showCommentTabs.tabIds).forEach(scTabId => {
      const targetTabId = Number(scTabId)
      const message: TargetTab = {
        type: 'target-tab',
        tabId: targetTabId,
        status: 'removed'
      }
      chrome.tabs.sendMessage(targetTabId, message)
    })
    store.update('showCommentTabs', { tabIds: {} })
    store.update('logTab', { tabId: 0 })
  }
}
