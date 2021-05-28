import electron from 'electron'

const TOGGLE_IGNORE_MOUSE_EVENTS_SHORTCUT: electron.Accelerator = 'F1'

export class IgnoreMouseEvents {
  private ignoreMouseEvents
  private mainWindow: electron.BrowserWindow

  constructor(mainWindow: electron.BrowserWindow) {
    this.mainWindow = mainWindow
    this.ignoreMouseEvents = true
  }

  registerGlobalShortcut(): void {
    electron.globalShortcut.register(TOGGLE_IGNORE_MOUSE_EVENTS_SHORTCUT, (): void => {
      this.ignoreMouseEvents = !this.ignoreMouseEvents
      this.mainWindow.setIgnoreMouseEvents(this.ignoreMouseEvents)
    })
  }

  unregisterGlobalShortcut(): void {
    electron.globalShortcut.unregister(TOGGLE_IGNORE_MOUSE_EVENTS_SHORTCUT)
  }

  resetIgnoreMouseEvents(): void {
    this.ignoreMouseEvents = true
    this.mainWindow.setIgnoreMouseEvents(true)
  }
}
