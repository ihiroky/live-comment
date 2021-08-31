import electron from 'electron'
import path from 'path'
import { getLogger } from 'common'

const log = getLogger('Subwindows')
const openWindows_: Record<string, electron.BrowserWindow> = {}
const APP_ROOT_PROTOCOL = 'approot'

function getHtmlDataUrl(title: string, src: string): string {
  return `data:text/html;charset=utf-8,
<html>
 <head>
  <title>${title}</title>
 </head>
 <body>
  <div id="root"></div>
  <script type="text/javascript" src="${src}"></script>
 </body>
</html>`
}

function contexteMenuEventHandler(_: electron.Event, params: electron.ContextMenuParams): void {
  const editFrags = params.editFlags
  const menu = electron.Menu.buildFromTemplate([
    { role: 'undo', enabled: editFrags.canUndo },
    { role: 'redo', enabled: editFrags.canRedo },
    { type: 'separator' },
    { role: 'cut', enabled: editFrags.canCut },
    { role: 'copy', enabled: editFrags.canCopy },
    { role: 'paste', enabled: editFrags.canPaste },
    { role: 'delete', enabled: editFrags.canDelete },
    { role: 'selectAll', enabled: editFrags.canSelectAll },
  ])
  menu.popup()
}

function createSubWindow(
  id: string,
  width: number,
  height: number,
  js: string
): electron.BrowserWindow | null {
  const openWindow = openWindows_[id]
  if (openWindow) {
    openWindow.focus()
    log.debug('Window', id, 'is already created.')
    return null
  }

  const window = new electron.BrowserWindow({
    width,
    height,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.resolve(`dist/js/preload/${js}`)
    },
  })
  const dataUrl = getHtmlDataUrl(id, js)
  window.webContents.on('context-menu', contexteMenuEventHandler)
  window.loadURL(dataUrl, {
    // https://github.com/electron/electron/issues/20700
    baseURLForDataURL: `${APP_ROOT_PROTOCOL}://resources/`,
  })
  window.on('closed', (): void => {
    delete openWindows_[id]
  })
  openWindows_[id] = window
  return window
}

export function registerAppRootProtocol(): void {
  if (!electron.app.isReady) {
    throw new Error('app is not ready.')
  }
  electron.protocol.registerFileProtocol(
    APP_ROOT_PROTOCOL,
    (request: electron.ProtocolRequest, callback: (response: electron.ProtocolResponse) => void) => {
      const url = request.url.substr(APP_ROOT_PROTOCOL.length + 3) // 3: '://'.length
      const filePath = path.resolve(url)
      log.debug(filePath)
      callback({ path: filePath })
    }
  )
}

export function createSettingsWindow(): void {
  createSubWindow(
    'SettingsForm',
    600,
    650,
    'settings.js'
  )
}

export function createPollWindow(): void {
  createSubWindow(
    'Poll',
    900,
    700,
    'poll.js',
  )
}