import electron from 'electron'
import { SettingsV1 } from '../Settings'

// Only type definition can be imported.

const CHANNEL_REQUEST_SETTINGS = '#request-settings'

electron.contextBridge.exposeInMainWorld('poll', {
  request: (): Promise<SettingsV1> => {
    return electron.ipcRenderer.invoke(CHANNEL_REQUEST_SETTINGS)
  },
})
