import { getLogger } from '@/common/Logger'
import { commentsShownTabIdStore } from './stores'
import { TargetTab } from './types'

const log = getLogger('background')

function addMessageListener(): void {
  chrome.runtime.onMessage.addListener((message: TargetTab, sender: chrome.runtime.MessageSender): void => {
    if (message.type !== 'target-tab') {
      return
    }
    const tabId = sender.tab?.id
    if (!tabId) {
      return
    }

    const status = commentsShownTabIdStore.cache.tabIds[tabId] ? 'added' : undefined
    const response: TargetTab = {
      type: 'target-tab',
      status,
      tabId,
    }
    log.info('SEND', tabId, response)
    chrome.tabs.sendMessage(tabId, response)
  })
}

commentsShownTabIdStore.subscribe(() => undefined)
addMessageListener()

log.info('background loaded.')
