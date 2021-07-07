import path from 'path'
import fs from 'fs'
import electron, { BrowserWindow } from 'electron'
import * as Settings from './Settings'
import { getLogger } from 'common'

const CHANNEL_REQUEST_SETTINGS = '#request-settings'
const CHANNEL_POST_SETTINGS = '#post-settings'
const CHANNEL_REQUEST_SCREEN_PROPS = '#request-screen-props'

const log = getLogger('index')

let mainWindow_: electron.BrowserWindow | null = null
let settingWindow_: electron.BrowserWindow | null = null

// https://www.electronjs.org/docs/faq#my-apps-tray-disappeared-after-a-few-minutes
let tray_: electron.Tray | null = null

function moveToRootDirectory(): void {
  const exePath = electron.app.getPath('exe')

  // Do not change working directory if run `yarn electron .`.
  // Linux:   .../electron
  // Windows: ...\\electron.exe
  // Mac:     .../Electron
  if (/[/\\][Ee]lectron(\.exe)?/.test(exePath)) {
    return
  }
  const rootDirectory = (process.platform === 'darwin')
    ? path.dirname(path.dirname(exePath))
    : path.dirname(exePath)
  log.debug('[moveToRootDirectory] exePath', exePath, ', root', rootDirectory)
  process.chdir(rootDirectory)
}

function loadSettings(): Settings.SettingsV1 {
  const userDataPath = electron.app.getPath('userData')
  const userConfigPath = path.join(userDataPath, 'user.config')
  if (!fs.existsSync(userConfigPath)) {
    return Settings.loadDefault()
  }

  try {
    const stat: fs.Stats = fs.statSync(userConfigPath)
    if (stat.isDirectory()) {
      return Settings.loadDefault()
    }
    const json = fs.readFileSync(userConfigPath, { encoding: 'utf8' })
    return Settings.parse(json)
  } catch {
    return Settings.loadDefault()
  }
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

async function asyncLoadSettings(): Promise<Settings.SettingsV1> {
  log.debug('[asyncLoadSettings] called.')
  try {
    const userConfigPath: fs.PathLike = await asyncGetUserConfigPromise(true)
    const json = await fs.promises.readFile(userConfigPath, { encoding: 'utf8' })
    const settings = Settings.parse(json)
    log.debug('[asyncLoadSettings]', settings)
    return settings
  } catch (e: unknown) {
    log.warn('[asyncLoadSettings] Failed to load user configuration file. Load default settings.', e)
    return Settings.loadDefault()
  }
}

async function asyncSaveSettings(e: electron.IpcMainInvokeEvent, settings: Settings.SettingsV1): Promise<void> {
  log.debug('[asyncSaveSttings]', settings)
  try {
    const userConfigPath: fs.PathLike = await asyncGetUserConfigPromise(false)
    const contents = JSON.stringify(settings)
    await fs.promises.writeFile(userConfigPath, contents, { encoding: 'utf8', mode: 0o600 })
    log.debug(`[asyncSaveSettings] Screen settings updated: ${contents}`)

    if (mainWindow_) {
      applySettings(mainWindow_, settings)
    }
  } catch (e: unknown) {
    log.warn('[asyncSaveSettings] Failed to save user configuration.', e)
  }
}

function showSettingWindow(): void {
  if (settingWindow_) {
    settingWindow_.close()
  }

  const settingWindow = new electron.BrowserWindow({
    width: 600,
    height: 650,
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
  // TODO Apply zoom factor to this window?

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
  tray_ = new electron.Tray(path.resolve('resources/icon.png'))
  tray_.setToolTip(electron.app.name)
  tray_.setContextMenu(menu)
}

function getWorkArea(index: number | undefined): electron.Rectangle {
  const display = index
    ? electron.screen.getAllDisplays()[index]
    : electron.screen.getPrimaryDisplay()
  log.debug('[getWorkArea]', index, display.size)
  return display.workArea
}


function applySettings(mainWindow: BrowserWindow, settings: Settings.SettingsV1): void {
  const workArea = getWorkArea(settings.general.screen)
  mainWindow.setBounds(workArea)
  mainWindow.loadURL(`file://${path.resolve('resources/main/index.html')}`)
  mainWindow.webContents.setZoomFactor(Number(settings.general.zoom) / 100)
}

async function asyncShowMainWindow(): Promise<void> {
  const settings = await asyncLoadSettings()

  // TODO toggle dev tools of main window from setting form

  // Needed not to be hidden by full screen apps on Mac.
  electron.app.dock?.hide()

  mainWindow_ = new electron.BrowserWindow({
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.resolve('dist/js/preload/main.js')
    }
  })
  mainWindow_.setAlwaysOnTop(true, 'screen-saver')
  mainWindow_.setVisibleOnAllWorkspaces(true)
  applySettings(mainWindow_, settings)
  mainWindow_.setIgnoreMouseEvents(true)
  if (process.argv.includes('--open-dev-tools')) {
    mainWindow_.webContents.openDevTools({ mode: 'detach' })
  }
  mainWindow_.on('closed', (): void => {
    mainWindow_ = null
  })
}

function onReady(): void {
  electron.ipcMain.handle(CHANNEL_REQUEST_SETTINGS, asyncLoadSettings)
  electron.ipcMain.handle(CHANNEL_POST_SETTINGS, asyncSaveSettings)
  electron.ipcMain.handle(CHANNEL_REQUEST_SCREEN_PROPS, asyncLoadSettings)

  moveToRootDirectory()
  showTrayIcon()
  asyncShowMainWindow()  // No need to wait
}

const settings = loadSettings()
if (!settings.general.gpu) {
  electron.app.disableHardwareAcceleration()
}
if (process.platform === 'linux') {
  electron.app.on('ready', (): void => {
    setTimeout(onReady, 100)
  })
} else {
  electron.app.on('ready', onReady)
}
electron.app.on('window-all-closed', (): void => {
  electron.app.dock?.show()
  if (process.platform !== 'darwin') {
    electron.app.quit()
  }
})
electron.app.on('activate', (): void => {
  if (electron.app.isReady() && mainWindow_ === null) {
    asyncShowMainWindow()  // No need to wait
  }
})
