import { createChromeStore } from '@/common/store'

type StoreObj = {
  logTab: {
    tabId: number
  }
  showCommentTabs: {
    tabIds: Record<number, true>
  }
  aggressive: boolean
}

export type StoreType = ReturnType<typeof createChromeStore<StoreObj>>

export const store = createChromeStore<StoreObj>(chrome.storage.local, {
  logTab: {
    tabId: 0,
  },
  showCommentTabs: {
    tabIds: {},
  },
  aggressive: true,
})
