import { getLogger } from '@/common/Logger'
import { checkTargetTabStatus, cleanUpExtensionTabs } from './backgroundListeners'
import { store } from './store'

const log = getLogger('background/index')

await store.sync()
chrome.runtime.onMessage.addListener(checkTargetTabStatus)
chrome.tabs.onRemoved.addListener(cleanUpExtensionTabs)
log.info('background loaded.')
