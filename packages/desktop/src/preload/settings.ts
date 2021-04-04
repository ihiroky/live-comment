import electron from 'electron'

const CHANNEL_REQUEST_SETTINGS = '#request-settings'
const CHANNEL_POST_SETTINGS = '#post-settings'

electron.contextBridge.exposeInMainWorld('settingsProxy', {
  requestSettings: (): Promise<Record<string, string>> => {
    return electron.ipcRenderer.invoke(CHANNEL_REQUEST_SETTINGS)
  },
  postSettings: (settings: Record<string, string>): Promise<void> => {
    return electron.ipcRenderer.invoke(CHANNEL_POST_SETTINGS, settings)
  }
})
