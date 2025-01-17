import { contextBridge, ipcRenderer, IpcRendererEvent, SourcesOptions } from 'electron'
import { SettingsV1 } from './settings'
import {
  CHANNEL_REQUEST_SETTINGS,
  CHANNEL_REQUEST_SCREEN_PROPS,
  CHANNEL_POST_SETTINGS,
  CHANNEL_DESKTOP_THUMBNAIL,
  CHANNEL_LOG_SEND,
  CHANNEL_LOG_RECV,
  CHANNEL_LOGIN,
} from './channels'
import { AcnMessage, Message } from '@/common/Message'

contextBridge.exposeInMainWorld('main', {
  request: (): Promise<SettingsV1> => {
    return ipcRenderer.invoke(CHANNEL_REQUEST_SCREEN_PROPS)
  },
  onMessage: (onMessage: (message: Message) => void): () => void => {
    const listener = (_: IpcRendererEvent, m: Message): void => onMessage(m)
    ipcRenderer.on(CHANNEL_LOG_RECV, listener)
    return (): void => {
      ipcRenderer.off(CHANNEL_LOG_RECV, listener)
    }
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

contextBridge.exposeInMainWorld('comment', {
  request: (): Promise<SettingsV1> => {
    return ipcRenderer.invoke(CHANNEL_REQUEST_SCREEN_PROPS)
  },
  send: (message: Message | null): Promise<void> => {
    return message ? ipcRenderer.invoke(CHANNEL_LOG_SEND, message) : Promise.resolve()
  },
  postCredential: (m: AcnMessage): Promise<void> => {
    return ipcRenderer.invoke(CHANNEL_LOGIN, m)
  },
  onLoggedIn: (onLoggedIn: (_: AcnMessage) => void): () => void => {
    const listener = (_: IpcRendererEvent, c: AcnMessage): void => onLoggedIn(c)
    ipcRenderer.on(CHANNEL_LOGIN, listener)
    return (): void => {
      ipcRenderer.off(CHANNEL_LOGIN, listener)
    }
  },
})
