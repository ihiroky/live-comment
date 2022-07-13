import { createRoot } from 'react-dom/client'
import { App } from '@/comment/App'
import { ComponentProps } from 'react'
import { Message } from '@/common/Message'
import {
  CommentOpenEvent,
  CommentCloseEvent,
  CommentMessageEvent,
  CommentErrorEvent,
} from '../types'
import { getLogger } from '@/common/Logger'

const log = getLogger('comment')
log.info('comment.tsx');

(function main(): void {

  const ports: chrome.runtime.Port[] = []
  chrome.runtime.onConnect.addListener((port: chrome.runtime.Port): void => {
    log.info('comment onConnect', port)
    ports.push(port)
    port.onDisconnect.addListener((port: chrome.runtime.Port): void => {
      const i = ports.indexOf(port)
      if (i > -1) {
        ports.splice(i, 1)
      }
      log.info('onDisconnect', port.name)
    })
  })

  const props: {
    onOpen: ComponentProps<typeof App>['onOpen']
    onClose: ComponentProps<typeof App>['onClose']
    onMessage: ComponentProps<typeof App>['onMessage']
    onError: ComponentProps<typeof App>['onError']
  } = {
    onOpen: (): void => {
      const m: CommentOpenEvent = {
        type: 'comment-open',
      }
      ports.forEach(p => p.postMessage(m))
    },
    onClose: (event: CloseEvent): void => {
      const m: CommentCloseEvent = {
        type: 'comment-close',
        event,
      }
      ports.forEach(p => p.postMessage(m))
    },
    onMessage: (message: Message): void => {
      const m: CommentMessageEvent = {
        type: 'comment-message',
        message,
      }
      log.info('onWsMessage', m)
      ports.forEach(p => p.postMessage(m))
    },
    onError: (event: Event): void => {
      const m: CommentErrorEvent = {
        type: 'comment-error',
        event,
      }
      ports.forEach(p => p.postMessage(m))
    }
  }

  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }
  const root = createRoot(rootElement)
  root.render(<App {...props} />)
})()
