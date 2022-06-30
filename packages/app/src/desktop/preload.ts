import { contextBridge, ipcRenderer, SourcesOptions } from 'electron'
import { SettingsV1 } from './settings'
import {
  CHANNEL_REQUEST_SETTINGS,
  CHANNEL_REQUEST_SCREEN_PROPS,
  CHANNEL_POST_SETTINGS,
  CHANNEL_DESKTOP_THUMBNAIL,
} from './channels'

contextBridge.exposeInMainWorld('main', {
  request: (): Promise<SettingsV1> => {
    return ipcRenderer.invoke(CHANNEL_REQUEST_SCREEN_PROPS)
  },
})

contextBridge.exposeInMainWorld('poll', {
  request: (): Promise<SettingsV1> => {
    return ipcRenderer.invoke(CHANNEL_REQUEST_SETTINGS)
  },
})

contextBridge.exposeInMainWorld('settings', {
  requestSettings: (): Promise<SettingsV1> => {
    return ipcRenderer.invoke(CHANNEL_REQUEST_SETTINGS)
  },
  postSettings: (settings: SettingsV1): Promise<void> => {
    return ipcRenderer.invoke(CHANNEL_POST_SETTINGS, settings)
  },
  async getScreenPropsList(): Promise<unknown> {
    const options: SourcesOptions = {
      types: ['screen'],
      thumbnailSize: { width: 300, height: 200 }
    }
    return ipcRenderer.invoke(CHANNEL_DESKTOP_THUMBNAIL, options)
  }
})
