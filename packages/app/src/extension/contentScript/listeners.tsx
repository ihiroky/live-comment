import { CommentEvent, Ping, Pong, TargetTab } from '../types'
import { getLogger } from '@/common/Logger'
import { makeStyles } from '@mui/styles'
import { createMessageSource, MessageScreen, PublishableMessageSource } from '@/screen/MessageScreen'
import { ComponentProps, StrictMode } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { store } from '../store'

const log = getLogger('contentScriptListeners')

const ROOT_ID = '_lc_root'

const useStyles = makeStyles({
  app: {
    position: 'fixed',
    inset: 0,
  }
})

function createRootElement(): Element | DocumentFragment {
  const oldDiv = document.getElementById(ROOT_ID)
  if (oldDiv) {
    document.documentElement.removeChild(oldDiv)
  }

  const div = document.createElement('div')
  div.id = ROOT_ID
  div.style.position = 'fixed'
  div.style.top = '0px'
  div.style.left = '0px'
  div.style.width = '100vw'
  div.style.height = '100vh'
  div.style.inset = '0px'
  div.style.margin = '0px'
  div.style.padding = '0px'
  div.style.zIndex = '2147483647'
  div.style.pointerEvents = 'none'
  div.style.background = 'transparent'
  document.documentElement.appendChild(div)

  const shadowRoot = div.attachShadow({ mode: 'open' })
  return shadowRoot
}

function App(props: ComponentProps<typeof MessageScreen>): JSX.Element {
  const styles = useStyles()
  return (
    <StrictMode>
      <div className={styles.app}>
        <MessageScreen {...props} />
      </div>
    </StrictMode>
  )
}

type Context = {
  port: chrome.runtime.Port
  root: Root
  tabId?:number
  closed: boolean
  release: () => void
  unsubscribeStoreUpdate: () => void
}

function reconnect(context: Context, messageSource: PublishableMessageSource): void {
  log.info(`${context.port.name} is stale. Try to close and open new port.`)

  context.port.disconnect()
  context.release()
  context.closed = true

  function setupAgain(): void {
    log.info('[setupAgain] start')
    if (!context.closed) {
      return
    }
    const newPort = chrome.runtime.connect({ name: 'popup-comments' })
    log.info('[reconnect] Connected port:', newPort.name)
    context.port = newPort
    context.closed = false
    setupListeners(context, messageSource)
    monitorPort(context, messageSource)
  }
  window.setTimeout(setupAgain, 1000)
}

function monitorPort(context: Context, messageSource: PublishableMessageSource): void {
  log.debug('[monitorPort]', context)
  let lastPong = Date.now()
  const id = context.tabId || (Date.now() / 1000 + 1000 * Math.random())

  const pongListener = (message: Pong): void => {
    if (message.type === 'pong' && message.id === id) {
      lastPong = Date.now()
      log.debug('pong', lastPong)
      return
    }
  }
  context.port.onMessage.addListener(pongListener)

  const interval = 1000
  function checkPingPong(): void {
    if (context.closed) {
      context.port.onMessage.removeListener(pongListener)
      log.debug('[checkPingPong] Finished by closed')
      return
    }
    try {
      const ping: Ping = {
        type: 'ping',
        id,
      }
      context.port.postMessage(ping)
      log.debug('ping', ping)
      if (Date.now() - lastPong <= 3000) {
        window.setTimeout(checkPingPong, interval)
        return
      }
      context.port.onMessage.removeListener(pongListener)
      reconnect(context, messageSource)
    } catch (e: unknown) {
      context.port.onMessage.removeListener(pongListener)
      reconnect(context, messageSource)
    }
    log.debug('[checkPingPong] Finished.')
  }

  window.setTimeout(checkPingPong, interval)
}

function setupListeners(context: Context, messageSource: PublishableMessageSource): void {
  log.info('[setupListeners]', context)
  const messageListener = (message: CommentEvent): void => {
    switch (message.type) {
      case 'comment-message': {
        messageSource.publish(message.message)
        break
      }
      default: {
        log.debug(message)
        break
      }
    }
  }

  if (document.visibilityState === 'visible') {
    context.port.onMessage.addListener(messageListener)
  }
  const visibilityChangeListener = (): void => {
    if (document.visibilityState === 'visible') {
      context.port.onMessage.addListener(messageListener)
    } else {
      context.port.onMessage.removeListener(messageListener)
    }
  }
  document.addEventListener('visibilitychange', visibilityChangeListener)
  context.release = (): void => {
    document.removeEventListener('visibilitychange', visibilityChangeListener)
  }
}

function createContext(tabId: number | undefined): Context {
  // TODO receive properties to render Screen.
  const messageSource = createMessageSource()
  const port = chrome.runtime.connect({ name: 'popup-comments' })
  log.debug('[createContext] Connected port:', port.name)

  const rootElement = createRootElement()
  const root = createRoot(rootElement)

  const context: Context = {
    port,
    root,
    closed: false,
    tabId,
    release: () => undefined,
    unsubscribeStoreUpdate: () => undefined
  }
  setupListeners(context, messageSource)
  monitorPort(context, messageSource)

  function renderApp(): void {
    const { general, watermark } = store.cache.settingsTab.settings
    root.render(
      <App
        duration={general.duration * 1000}
        color={general.fontColor}
        fontBorderColor={general.fontBorderColor}
        watermark={watermark}
        messageSource={messageSource}
      />
    )
  }
  context.unsubscribeStoreUpdate = store.subscribe(renderApp)
  renderApp()

  return context
}


export const createTargetTabStatusListener = (): ((message: TargetTab) => void) => {
  let context: Context | null = null

  return (message: TargetTab): void => {
    log.info('chrome.runtime.onMessage', message, !!context)
    if (message.type === 'target-tab') {
      switch (message.status) {
        case 'added':
          if (context === null) {
            context = createContext(message.tabId)
          }
          break
        case 'removed':
          if (context) {
            context.root.unmount()
            context.port.disconnect()
            context.release()
            context.unsubscribeStoreUpdate()
            context.closed = true
            const div = document.getElementById(ROOT_ID)
            if (div) {
              document.documentElement.removeChild(div)
            }
            context = null
          }
      }
    }
  }
}