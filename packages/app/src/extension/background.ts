import { getLogger } from '@/common/Logger'
import { store } from './store'
import { TargetTab } from './types'

const log = getLogger('background')

function canShowComments(tabId: number): boolean {
  // Can't show comments if log window is not open.
  log.info(store.cache.logTab.tabId, !store.cache.logTab.tabId)
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

function addMessageListener(): void {
  chrome.runtime.onMessage.addListener((message: TargetTab, sender: chrome.runtime.MessageSender): void => {
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
  })
}

async function main(): Promise<void> {
  addMessageListener()
  await store.sync()
  log.info('background loaded.')
}

main()