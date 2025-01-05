import electron from 'electron'
import path from 'path'
import { getLogger } from '../common/Logger'

const log = getLogger('Subwindows')
const openWindows_: Record<string, electron.BrowserWindow> = {}
const APP_ROOT_PROTOCOL = 'approot'

function getHtmlDataUrl(title: string, src: string, mainFunc: string): string {
  return `data:text/html;charset=utf-8,
<html>
 <head>
  <title>${title}</title>
 </head>
 <body>
  <div id="root"></div>
  <script type="module" src="${src}"></script>
  <script type="module">
import { ${mainFunc} } from '${src}';
${mainFunc}();
  </script>
 </body>
</html>`
}

export function handleContextMenu(_: electron.Event, params: electron.ContextMenuParams): void {
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
    { type: 'separator' },
    { role: 'toggleDevTools' },
  ])
  menu.popup()
}

function createSubWindow(
  id: string,
  preload: string,
  width: number,
  height: number,
  mainFuncName: string
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
      preload,
    },
  })
  const dataUrl = getHtmlDataUrl(id, './renderer.js', mainFuncName)
  window.webContents.on('context-menu', handleContextMenu)
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

  electron.protocol.handle(APP_ROOT_PROTOCOL, (request: GlobalRequest): Promise<GlobalResponse> => {
    const url = request.url.substring(APP_ROOT_PROTOCOL.length + 3) // 3: '://'.length
    const filePath = path.resolve(url)
    log.debug(filePath)
    return electron.net.fetch(`file://${filePath}`)
  })
}

export function createSettingsWindow(preload: string): void {
  createSubWindow('SettingsForm', preload, 600, 700, 'settingsMain')
}

export function createPollWindow(preload: string): void {
  createSubWindow('Poll', preload, 900, 700, 'pollMain')
}
