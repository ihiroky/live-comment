import { contextBridge, ipcRenderer } from 'electron'
import { SettingsV1 } from '../settings'
import { CHANNEL_REQUEST_SETTINGS } from '../channels'

contextBridge.exposeInMainWorld('poll', {
  request: (): Promise<SettingsV1> => {
    return ipcRenderer.invoke(CHANNEL_REQUEST_SETTINGS)
  },
})
