import electron from 'electron'

const CHANNEL_REQUEST_SETTINGS = '#request-settings'
const CHANNEL_POST_SETTINGS = '#post-settings'

type ScreenProps = {
  name: string
  thumbnailDataUrl: string
}

electron.contextBridge.exposeInMainWorld('settingsProxy', {
  requestSettings: (): Promise<Record<string, string>> => {
    return electron.ipcRenderer.invoke(CHANNEL_REQUEST_SETTINGS)
  },
  postSettings: (settings: Record<string, string>): Promise<void> => {
    return electron.ipcRenderer.invoke(CHANNEL_POST_SETTINGS, settings)
  },
  async getScreenPropsList(): Promise<ScreenProps[]> {
    const options: electron.SourcesOptions = {
      types: ['screen'],
      thumbnailSize: { width: 300, height: 200 }
    }
    const sources: electron.DesktopCapturerSource[] = await electron.desktopCapturer.getSources(options)
    console.log('sources', sources)
    return sources.map((src: electron.DesktopCapturerSource): ScreenProps => ({
      name: src.name,
      thumbnailDataUrl: src.thumbnail.toDataURL()
    }))
  }
})
