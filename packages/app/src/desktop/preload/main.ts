import { contextBridge, ipcRenderer } from 'electron'
import { SettingsV1 } from '../settings'
import { CHANNEL_REQUEST_SCREEN_PROPS } from '../channels'

contextBridge.exposeInMainWorld('main', {
  request: (): Promise<SettingsV1> => {
    return ipcRenderer.invoke(CHANNEL_REQUEST_SCREEN_PROPS)
  },
})
