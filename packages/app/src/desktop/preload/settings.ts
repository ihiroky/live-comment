import { contextBridge, ipcRenderer, SourcesOptions } from 'electron'

import {
  SettingsV1
} from '../settings'
import {
  CHANNEL_REQUEST_SETTINGS,
  CHANNEL_POST_SETTINGS,
  CHANNEL_DESKTOP_THUMBNAIL,
  ScreenProps,
} from '../channels'


contextBridge.exposeInMainWorld('settings', {
  requestSettings: (): Promise<SettingsV1> => {
    return ipcRenderer.invoke(CHANNEL_REQUEST_SETTINGS)
  },
  postSettings: (settings: SettingsV1): Promise<void> => {
    return ipcRenderer.invoke(CHANNEL_POST_SETTINGS, settings)
  },
  async getScreenPropsList(): Promise<ScreenProps[]> {
    const options: SourcesOptions = {
      types: ['screen'],
      thumbnailSize: { width: 300, height: 200 }
    }
    return ipcRenderer.invoke(CHANNEL_DESKTOP_THUMBNAIL, options)
  }
})
