import { createChromeStore } from '@/common/store'

export const store = createChromeStore<
  {
    logTab: {
      tabId: number
    }
    showCommentTabs: {
      tabIds: Record<number, true>
    }
    aggressive: boolean
  }
>(chrome.storage.local, {
  logTab: {
    tabId: 0,
  },
  showCommentTabs: {
    tabIds: {},
  },
  aggressive: true,
})
