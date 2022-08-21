import { CommentEvent, TargetTab } from '../types'
import { getLogger } from '@/common/Logger'
import { makeStyles } from '@mui/styles'
import { createMessageSource, MessageScreen } from '@/screen/MessageScreen'
import { ComponentProps, StrictMode } from 'react'
import { createRoot, Root } from 'react-dom/client'

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
}

function createContext(): Context {
  // TODO receive properties to render Screen.
  const port = chrome.runtime.connect({ name: 'popup-comments' })
  log.debug('[createContext] Connected port:', port.name)

  const messageSource = createMessageSource()
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
    port.onMessage.addListener(messageListener)
  }
  document.addEventListener('visibilitychange', (): void => {
    if (document.visibilityState === 'visible') {
      port.onMessage.addListener(messageListener)
    } else {
      port.onMessage.removeListener(messageListener)
    }
  })

  const rootElement = createRootElement()
  const root = createRoot(rootElement)

  const watermark: ComponentProps<typeof App>['watermark'] = {
    html: `🐳`,
    opacity: 0.33,
    color: '#333333',
    fontSize: '48px',
    position: 'bottom-right',
    offset: '3%',
    noComments: false
  }
  root.render(
    <App
      duration={7000}
      color={'#111111'}
      fontBorderColor={'#cccccc'}
      watermark={watermark}
      messageSource={messageSource}
    />
  )

  return{ port, root }
}


export const createTargetTabStatusListener = (): ((message: TargetTab) => void) => {
  let context: Context | null = null

  return (message: TargetTab): void => {
    log.info('chrome.runtime.onMessage', message, !!context)
    if (message.type === 'target-tab') {
      switch (message.status) {
        case 'added':
          if (context === null) {
            context = createContext()
          }
          break
        case 'removed':
          if (context) {
            context.port.disconnect()
            context.root.unmount()
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