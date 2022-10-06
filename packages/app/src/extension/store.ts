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

const defaultSettings = loadDefault(false)

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
    settings: defaultSettings,
  },
})
