import { getLogger } from '@/common/Logger'
import { store } from './store'
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

    const status = store.cache['lc.shown-comemnts-tab'].tabIds[tabId] ? 'added' : undefined
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