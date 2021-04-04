import path from 'path'
import electron, { Tray } from 'electron'

const CHANNEL_REQUEST_SETTINGS = '#request-settings'
const CHANNEL_POST_SETTINGS = '#post-settings'

// TODO run server then desktop to develop

let mainWindow_: electron.BrowserWindow | null = null
let settingWindow_: electron.BrowserWindow | null = null
const screenSettings: Record<string, string> = {
  messageDuration: '5',
  url: 'wss://live-comment.ml/app'
}

// https://www.electronjs.org/docs/faq#my-apps-tray-disappeared-after-a-few-minutes
let tray_: electron.Tray | null = null

function getWorkArea(): electron.Rectangle {
  const cursorPoint: electron.Point = electron.screen.getCursorScreenPoint()
  const display: electron.Display = electron.screen.getDisplayNearestPoint(cursorPoint)
  return display.workArea
}

function handleRequestSettings(): Promise<Record<string, string>> {
  console.debug(CHANNEL_REQUEST_SETTINGS)
  return new Promise<Record<string, string>>((resolve: (settings: Record<string, string>) => void): void => {
    resolve(screenSettings)
  })
}

function handlePostSettings(e: electron.IpcMainInvokeEvent, settings: Record<string, string>): Promise<void> {
  console.debug(CHANNEL_POST_SETTINGS, settings)
  return new Promise<void>((resolve: () => void): void => {
    for (const i in screenSettings) {
      if (settings[i]) {
        screenSettings[i] = settings[i]
      }
    }
    console.log(`Screen settings updated: ${JSON.stringify(screenSettings)}`)
    mainWindow_?.on('closed', (): void => {
      const mw = createMainWindow()
      mw.on('closed', (): void => {
        mainWindow_ = null
      })
      mainWindow_ = mw
    })
    mainWindow_?.close()
    resolve()
  })
}

function showSettingWindow(): void {
  if (settingWindow_) {
    settingWindow_.close()
  }

  const settingWindow = new electron.BrowserWindow({
    width: 300,
    height: 400,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.resolve('dist/js/preload/settings.js')
    }
  })
  settingWindow.loadURL(`file://${path.resolve('resources/settings/index.html')}`)
  settingWindow.on('closed', (): void => {
    settingWindow_ = null
  })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  settingWindow_ = settingWindow
}

function createTrayIcon(): electron.Tray {
  const menu: electron.Menu = electron.Menu.buildFromTemplate([
    { label: 'Settings', click: showSettingWindow },
    { label: 'Quit', role: 'quit' }
  ])
  const tray = new Tray('resources/icon.png')
  tray.setToolTip(electron.app.name)
  tray.setContextMenu(menu)
  return tray
}

function createMainWindow(): electron.BrowserWindow {
  const workArea = getWorkArea()
  const mainWindow = new electron.BrowserWindow({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,
    show: false,
    frame: false,
    transparent: true,
    focusable: false,  // Must be set to enable 'alwaysOnTop' on Linux
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true
    }
  })
  const fileUrl = `file://${path.resolve('resources/screen/index.html')}`
    + `?messageDuration=${screenSettings.messageDuration}`
    + `&url=${screenSettings.url}`
  mainWindow.loadURL(fileUrl)
  mainWindow.webContents.openDevTools({ mode: 'detach' })
  mainWindow.setIgnoreMouseEvents(true)
  mainWindow.once('ready-to-show', (): void  => {
    mainWindow.show()
  })
  return mainWindow
}

function onReady(): void {
  electron.ipcMain.handle(CHANNEL_REQUEST_SETTINGS, handleRequestSettings)
  electron.ipcMain.handle(CHANNEL_POST_SETTINGS, handlePostSettings)

  tray_ = createTrayIcon()
  mainWindow_ = createMainWindow()
  mainWindow_.on('closed', (): void => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tray_ = null
    mainWindow_ = null
  })
}

function onQuit(): void {
  console.log('onQuit')
}

function onCertificationError(event: electron.Event, webContents: electron.WebContents, url: string, error: string, certificate: electron.Certificate, callback: (isTrusted: boolean) => void): void {
  console.warn(url, error)
  event.preventDefault()
  callback(true)
}

if (process.platform === 'linux') {
  // https://stackoverflow.com/questions/53538215/cant-succeed-in-making-transparent-window-in-electron-javascript
  electron.app.commandLine.appendSwitch('enable-transparent-visuals')
  electron.app.on('ready', () => setTimeout(onReady, 100))
} else {
  electron.app.on('ready', onReady)
}
electron.app.on('window-all-closed', onQuit)
electron.app.on('certificate-error', onCertificationError)
