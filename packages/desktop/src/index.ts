import path from 'path'
import electron from 'electron'

// TODO run server then desktop to develop

let mainWindow: electron.BrowserWindow | null = null 

function getWorkArea(): electron.Rectangle {
  const cursorPoint: electron.Point = electron.screen.getCursorScreenPoint()
  const display: electron.Display = electron.screen.getDisplayNearestPoint(cursorPoint)
  return display.workArea
}

function onReady(): void {
  const workArea = getWorkArea()
  mainWindow = new electron.BrowserWindow({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: {
      contextIsolation: true
    }
  })
  mainWindow.loadURL(`file://${path.resolve('public/index.html')}`)
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => mainWindow = null)
  mainWindow.webContents.openDevTools({ mode: 'detach' })
}

function onQuit(): void {
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
