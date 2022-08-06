import { App } from '@/comment/App'
import { getLogger } from '@/common/Logger'
import { Message } from '@/common/Message'
import { CommentCloseEvent, CommentErrorEvent, CommentMessageEvent, CommentOpenEvent, LogWindowEvent } from '../types'
import { ComponentProps } from 'react'

const log = getLogger('commentProps')

export function createCommentAppProps(): Required<ComponentProps<typeof App>> {
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

  const props: Required<ComponentProps<typeof App>> = {
    onMount: (): void => {
      const open: LogWindowEvent = {
        type: 'log-window-event',
        status: 'open'
      }
      chrome.runtime.sendMessage(open)
    },
    onUnmount: (): void => {
      const close: LogWindowEvent = {
        type: 'log-window-event',
        status: 'close'
      }
      chrome.runtime.sendMessage(close)
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