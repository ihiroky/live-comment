import { createChromeStore } from '@/common/store'
import { loadDefault, SettingsV1 } from '@/settings/settings'

type StoreObj = {
  logTab: {
    tabId: number
  }
  showCommentTabs: {
    tabIds: Record<number, true>
  }
  aggressive: boolean
  settingsTab: {
    tabId: number
    settings: SettingsV1
  }
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
  settingsTab: {
    tabId: 0,
    settings: loadDefault(false), // TODO Set lazily by function.
  },
})
