import electron from 'electron'
import fs from 'fs'
import path from 'path'
import { getLogger } from '../common/Logger'

const log = getLogger('Subwindows')
const openWindows_: Record<string, electron.BrowserWindow> = {}
const APP_ROOT_PROTOCOL = 'approot'
const APP_ROOT_DIR = 'resources'

function generateHtml(title: string, src: string, mainFunc: string): string {
  const html = `<html>
 <head>
  <title>${title}</title>
  <style>
html {
  height: 100%;
}
body {
  margin: 0px;
  overflow: hidden;
  height: 100%;
}
#root {
  height: 100%;
}
  </style>
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
  const filePath = path.resolve(`${APP_ROOT_DIR}/${mainFunc}.html`)
  fs.writeFileSync(filePath, html)
  return `file://${filePath}`
}

function createSubWindow(
  id: string,
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
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.resolve(`dist/desktop/preload.js`)
    },
  })
  window.webContents.on('context-menu', (_: electron.Event, params: electron.ContextMenuParams): void => {
    const editFrags = params.editFlags
    const alwaysOnTop = window.isAlwaysOnTop()
    const menu = electron.Menu.buildFromTemplate([
      {
        label: alwaysOnTop ? 'Cancel always on top' : 'Always on top',
        click: () => window.setAlwaysOnTop(!alwaysOnTop)
      },
      { type: 'separator' },
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
  })
  const fileUrl = generateHtml(id, './renderer.js', mainFuncName)
  window.loadURL(fileUrl)
  window.on('ready-to-show', (): void => {
    window.show()
  })
  window.on('closed', (): void => {
    delete openWindows_[id]
  })
  openWindows_[id] = window
  return window
}

// TODO remove since unused
export function registerAppRootProtocol(): void {
  if (!electron.app.isReady) {
    throw new Error('app is not ready.')
  }
  electron.protocol.registerFileProtocol(
    APP_ROOT_PROTOCOL,
    (request: electron.ProtocolRequest, callback: (response: electron.ProtocolResponse) => void) => {
      const url = request.url.substring(APP_ROOT_PROTOCOL.length + 3) // 3: '://'.length
      const filePath = path.resolve(url)
      log.debug(filePath)
      callback({ path: filePath })
    }
  )
}

export function createSettingsWindow(): void {
  createSubWindow('SettingsForm', 600, 700, 'settingsMain')
}

export function createPollWindow(): void {
  createSubWindow('Poll', 900, 700, 'pollMain')
}

export function createCommentWindow(): electron.BrowserWindow | null {
  return createSubWindow('Comment', 800, 600, 'commentMain')
}
