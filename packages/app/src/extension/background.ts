import { getLogger } from '@/common/Logger'
import { checkTargetTabStatus, cleanUpExtensionTabs } from './background/listeners'
import { store } from './store'

const log = getLogger('background/index')

;(async function(): Promise<void> {
  await store.sync()
  await store.update('logTab', { tabId: 0 })
  await store.update('showCommentTabs', { tabIds: {} })
  await store.update('settingsTab', {
    ...store.cache.settingsTab,
    tabId: 0,
  })

  chrome.runtime.onMessage.addListener(checkTargetTabStatus)
  chrome.tabs.onRemoved.addListener(cleanUpExtensionTabs)
  log.info('background loaded.')
})()
