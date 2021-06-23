import electron from 'electron'

// Only type definition can be imported.

const CHANNEL_POLL_POST_CONFIG = '#poll-poll-config'

electron.contextBridge.exposeInMainWorld('poll', {
  postConfig: (data: { a: number }): Promise<void> => {
    return electron.ipcRenderer.invoke(CHANNEL_POLL_POST_CONFIG, data)
  },
})
