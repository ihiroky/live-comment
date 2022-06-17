import { contextBridge, ipcRenderer, SourcesOptions } from 'electron'
import { SettingsV1 } from './settings'

// The same constants as ./channel.ts to skip bundle preload script.
const CHANNEL_REQUEST_SETTINGS = '#request-settings'
const CHANNEL_POST_SETTINGS = '#post-settings'
const CHANNEL_REQUEST_SCREEN_PROPS = '#request-screen-props'
const CHANNEL_DESKTOP_THUMBNAIL = '#desktop-thumbnail'

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
