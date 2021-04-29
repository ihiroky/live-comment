import electron from 'electron'

// Only type definition can be imported.
import {
  SettingsV1
} from '../Settings'

const CHANNEL_REQUEST_SCREEN_PROPS = '#request-screen-props'

electron.contextBridge.exposeInMainWorld('main', {
  request: (): Promise<SettingsV1> => {
    return electron.ipcRenderer.invoke(CHANNEL_REQUEST_SCREEN_PROPS)
  },
})
