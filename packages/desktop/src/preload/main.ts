import electron from 'electron'

// Only type definition can be imported.
import {
  SettingsV1
} from '../Settings'

const CHANNEL_REQUEST_SCREEN_PROPS = '#request-screen-props'
const CHANNEL_ON_SCREEN_COMMAND_EXECUTED = '#on-screen-command-executed'

electron.contextBridge.exposeInMainWorld('main', {
  request: (): Promise<SettingsV1> => {
    return electron.ipcRenderer.invoke(CHANNEL_REQUEST_SCREEN_PROPS)
  },
  onCommandExecuted: (command: string): Promise<void> => {
    return electron.ipcRenderer.invoke(CHANNEL_ON_SCREEN_COMMAND_EXECUTED, { command })
  }
})
