import path from 'path'
import fs from 'fs'
import electron from 'electron'
import * as Settings from './Settings'

const CHANNEL_REQUEST_SETTINGS = '#request-settings'
const CHANNEL_POST_SETTINGS = '#post-settings'

let mainWindow_: electron.BrowserWindow | null = null
let settingWindow_: electron.BrowserWindow | null = null

// https://www.electronjs.org/docs/faq#my-apps-tray-disappeared-after-a-few-minutes
let tray_: electron.Tray | null = null

function getWorkArea(): electron.Rectangle {
  const cursorPoint: electron.Point = electron.screen.getCursorScreenPoint()
  const display: electron.Display = electron.screen.getDisplayNearestPoint(cursorPoint)
  return display.workArea
}

async function asyncGetUserConfigPromise(checkIfExists: boolean): Promise<fs.PathLike> {
  const userDataPath = electron.app.getPath('userData')
  const userConfigPath = path.join(userDataPath, 'user.config')
  try {
    const stat: fs.Stats = await fs.promises.stat(userConfigPath)
    if (stat.isDirectory()) {
      throw new Error(`User configuration file ${userConfigPath} is a direcotry.`)
    }
  } catch (e: unknown) {
    if (checkIfExists) {
      throw e
    }
  }
  return userConfigPath
}

async function asyncLoadSettings(): Promise<Record<string, string>> {
  console.debug(CHANNEL_REQUEST_SETTINGS)
  try {
    const userConfigPath: fs.PathLike = await asyncGetUserConfigPromise(true)
    const json = await fs.promises.readFile(userConfigPath, { encoding: 'utf8' })
    const settings = Settings.parse(json)
    if (process.argv[1]) {
      settings.url = process.argv[1]
    }
    return settings
  } catch (e: unknown) {
    console.warn(`Failed to load user configuration file. Load default settings.`, e)
    return Settings.loadDefault()
  }
}

async function asyncSaveSettings(e: electron.IpcMainInvokeEvent, settings: Record<string, string>): Promise<void> {
  console.debug(CHANNEL_POST_SETTINGS, settings)
  try {
    Settings.validate(settings)
    const userConfigPath: fs.PathLike = await asyncGetUserConfigPromise(false)
    const contents = JSON.stringify(settings)
    await fs.promises.writeFile(userConfigPath, contents, { encoding: 'utf8', mode: 0o600 })
    console.log(`Screen settings updated: ${contents}`)  // TODO Drop password?

    const screenUrl = createScreenUrl(settings)
    mainWindow_?.loadURL(screenUrl)
    mainWindow_?.webContents.setZoomFactor(Number(settings.zoom) / 100)
  } catch (e: unknown) {
    console.warn('Failed to save user configuration.', e)
  }
}

function showSettingWindow(): void {
  if (settingWindow_) {
    settingWindow_.close()
  }

  const settingWindow = new electron.BrowserWindow({
    width: 600,
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

function showTrayIcon(): void {
  if (tray_) {
    tray_.destroy()
  }
  const menu: electron.Menu = electron.Menu.buildFromTemplate([
    { label: 'Settings', click: showSettingWindow },
    { label: 'Quit', role: 'quit' }
  ])
  tray_ = new electron.Tray('resources/icon.png')
  tray_.setToolTip(electron.app.name)
  tray_.setContextMenu(menu)
}

function createScreenUrl(settings: Record<string, string>): string {
  // TODO Pass parameters like setting form because type check is disabled here
  return `file://${path.resolve('resources/screen/index.html')}`
    + `?duration=${settings.duration}`
    + `&url=${settings.url}`
    + `&room=${settings.room}`
    + `&password=${settings.password}`
}

async function asyncShowMainWindow(): Promise<void> {
  const workArea = getWorkArea()
  mainWindow_ = new electron.BrowserWindow({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,
    show: false,
    frame: false,
    transparent: true,
    focusable: false,  // Must be set false to enable 'alwaysOnTop' on Linux
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true
    }
  })
  const settings = await asyncLoadSettings()
  const screenUrl = createScreenUrl(settings)
  mainWindow_.loadURL(screenUrl)
  mainWindow_?.webContents.setZoomFactor(Number(settings.zoom) / 100)
  mainWindow_.webContents.openDevTools({ mode: 'detach' })
  mainWindow_.setIgnoreMouseEvents(true)
  mainWindow_.once('ready-to-show', (): void  => {
    mainWindow_?.show()
  })
  mainWindow_.on('closed', (): void => {
    mainWindow_ = null
  })
}

function onReady(): void {
  electron.ipcMain.handle(CHANNEL_REQUEST_SETTINGS, asyncLoadSettings)
  electron.ipcMain.handle(CHANNEL_POST_SETTINGS, asyncSaveSettings)

  showTrayIcon()
  asyncShowMainWindow()  // No need to wait
}

if (process.platform === 'linux') {
  // https://stackoverflow.com/questions/53538215/cant-succeed-in-making-transparent-window-in-electron-javascript
  electron.app.commandLine.appendSwitch('enable-transparent-visuals')
  electron.app.on('ready', (): void => {
    setTimeout(onReady, 100)
  })
} else {
  electron.app.on('ready', onReady)
}
electron.app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    electron.app.quit()
  }
})
electron.app.on('activate', (): void => {
  if (electron.app.isReady() && mainWindow_ === null) {
    asyncShowMainWindow()  // No need to wait
  }
})
