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

function showSubWindow(
  id: string,
  width: number,
  height: number,
  js: string
): electron.BrowserWindow {
  const openWindow = openWindows_[id]
  if (openWindow) {
    openWindow.close()
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

export function showSettingsWindow(): void {
  showSubWindow(
    'SettingsForm',
    600,
    650,
    'settings.js'
  )
}

export function showPollWindow(): void {
  showSubWindow(
    'Poll',
    900,
    700,
    'poll.js',
  )
}