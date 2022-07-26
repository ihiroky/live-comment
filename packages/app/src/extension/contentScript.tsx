import { getLogger } from '@/common/Logger'
import { createTargetTabStatusListener } from './contentScript/listeners'
import { TargetTab } from './types'

const log = getLogger('contentScript')

const listener = createTargetTabStatusListener()
chrome.runtime.onMessage.addListener(listener)
const queryStatus: TargetTab = {
  type: 'target-tab',
}
log.info('SEND', queryStatus)
chrome.runtime.sendMessage(queryStatus)

log.info('Content script loaded.')