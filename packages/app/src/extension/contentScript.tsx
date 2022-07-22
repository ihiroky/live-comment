import { createRoot, Root } from 'react-dom/client'
import { getLogger } from '@/common/Logger'
import { CommentEvent, TargetTab } from './types'
import { makeStyles } from '@mui/styles'
import { ComponentProps, StrictMode } from 'react'
import { MessageScreen, createMessageSource } from '@/screen/MessageScreen'

const log = getLogger('contentScript')

const useStyles = makeStyles({
  app: {
    position: 'fixed',
    inset: 0,
  }
})

function createRootElement(): Element | DocumentFragment {
  const ID = '_lc_root'

  const oldDiv = document.getElementById(ID)
  if (oldDiv) {
    document.documentElement.removeChild(oldDiv)
  }

  const div = document.createElement('div')
  div.id = ID
  div.style.position = 'fixed'
  div.style.inset = '0px'
  div.style.zIndex = '2147483647'
  div.style.pointerEvents = 'none'
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
  port.onMessage.addListener((message: CommentEvent): void => {
    // TODO Drop message ? if this tab is not active
    log.info(port?.name, 'onMessage', message)
    if (message.type === 'comment-message') {
      messageSource.publish(message.message)
    }
  })

  const rootElement = createRootElement()
  const root = createRoot(rootElement)
  root.render(<App duration={7000} color={'red'} fontBorderColor={'white'} watermark={undefined} messageSource={messageSource} />)
  log.info('Content script main loaded.')

  return{ port, root }
}

async function main(): Promise<void> {
  let context: Context | null = null
  chrome.runtime.onMessage.addListener((message: TargetTab): void => {
    log.info('chrome.runtime.onMessage', message, context)
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
            context = null
          }
      }
    }
  })

  const queryStatus: TargetTab = {
    type: 'target-tab',
  }
  log.info('SEND', queryStatus)
  chrome.runtime.sendMessage(queryStatus)
}

main()
log.info('Content script loaded.')