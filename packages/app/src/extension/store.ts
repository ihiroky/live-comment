import { createChromeStore } from '@/common/store'

const KEY_LOG_TAB = 'lc.log-tab'
const KEY_SHOWN_COMMENTS = 'lc.shown-comemnts-tab'

export const store = createChromeStore<
  {
    [KEY_LOG_TAB]: {
      tabId: number
    }
    [KEY_SHOWN_COMMENTS]: {
      tabIds: Record<number, true>
    }
  }
>(chrome.storage.local, {
  [KEY_LOG_TAB]: {
    tabId: 0,
  },
  [KEY_SHOWN_COMMENTS]: {
    tabIds: {}
  }
})
