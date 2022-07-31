import { getLogger } from '@/common/Logger'
import { checkTargetTabStatus, cleanUpExtensionTabs } from './background/listeners'
import { store } from './store'

const log = getLogger('background/index')

;(async function(): Promise<void> {
  await store.sync()
  chrome.runtime.onMessage.addListener(checkTargetTabStatus)
  chrome.tabs.onRemoved.addListener(cleanUpExtensionTabs)
  log.info('background loaded.')
})()
