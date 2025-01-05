import { App } from '@/comment/App'
import { getLogger } from '@/common/Logger'
import { Message } from '@/common/Message'
import { CommentCloseEvent, CommentErrorEvent, CommentMessageEvent, CommentOpenEvent, LogWindowEvent, Ping, Pong } from '../types'
import { ComponentProps } from 'react'

const log = getLogger('commentProps')

export function createCommentAppProps(): Required<ComponentProps<typeof App>> {
  log.info('[createCommentAppProps] called', document.URL)
  const ports: chrome.runtime.Port[] = []
  const onConnected = (port: chrome.runtime.Port): void => {
    log.info('comment onConnect', port)
    ports.push(port)
    port.onDisconnect.addListener((port: chrome.runtime.Port): void => {
      const i = ports.indexOf(port)
      if (i > -1) {
        ports.splice(i, 1)
      }
      log.info('onDisconnect', port.name, i)
    })
    port.onMessage.addListener((message: Ping, p: chrome.runtime.Port): void => {
      if (message.type === 'ping') {
        log.debug('ping from ', message.id, p.sender?.tab?.id)
        const pong: Pong = {
          type: 'pong',
          id: message.id,
        }
        p.postMessage(pong)
      }
    })
  }

  const props: Required<ComponentProps<typeof App>> = {
    origin: '',
    wsUrl: '',
    apiUrl: '',
    logoRatio: 0.9,
    onMount: (): void => {
      log.debug('[onMount]')
      chrome.runtime.onConnect.addListener(onConnected)
      const open: LogWindowEvent = {
        type: 'log-window-event',
        status: 'open'
      }
      chrome.runtime.sendMessage(open)
    },
    onUnmount: (): void => {
      log.debug('[onUnmount]')
      const close: LogWindowEvent = {
        type: 'log-window-event',
        status: 'close'
      }
      chrome.runtime.sendMessage(close)
      chrome.runtime.onConnect.removeListener(onConnected)
    },
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

  return props
}
