import { getLogger } from '@/common/Logger'
import { CommentMessage, Message } from '@/common/Message'
import { useEffect } from 'react'
import { MutableRefObject, useRef } from 'react'

export interface WebSocketControl {
  _reconnectTimer: number
  send(message: Message): void
  reconnect(): void
  reconnectWithBackoff(): void
  close(): void
}

type WebSocketEvent<T> = {
  addListener: (listener: T) => void
  removeListener: (listener: T) => void
}

class BaseWebSocketEvent<T> implements WebSocketEvent<T> {
  listeners: Array<T> = []

  addListener(listener: T): void {
    this.listeners.push(listener)
  }

  removeListener(listener: T): void {
    const i = this.listeners.indexOf(listener)
    if (i >= 0) {
      this.listeners.splice(i, 1)
    }
  }
}

class WebSocketOpenEvent extends BaseWebSocketEvent<(c: WebSocketControl) => void> {
  control: WebSocketControl | null = null

  override addListener(listener: (c: WebSocketControl) => void): void {
    super.addListener(listener)
    if (this.control) {
      listener(this.control)
    }
  }
}

export type WebSocketEvents = {
  onOpen: WebSocketEvent<(control: WebSocketControl) => void>
  onClose: WebSocketEvent<(ev: CloseEvent) => void>
  onMessage: WebSocketEvent<(message: Message) => void>
  onError: WebSocketEvent<(ev: Event) => void>
}

const log = getLogger('useWebSocket')

export function createWebSocket(
  url: string,
  onOpen: WebSocketOpenEvent,
  onClose: BaseWebSocketEvent<(ev: CloseEvent) => void>,
  onError: BaseWebSocketEvent<(ev: Event) => void>,
  onMessage: BaseWebSocketEvent<(message: Message) => void>,
  webSocketRef: MutableRefObject<WebSocket | null>
): void {
  if (!/^wss?:\/\/./.test(url)) {
    webSocketRef.current = null
    return
  }

  const webSocket = new WebSocket(url)
  webSocket.addEventListener('open', (ev: Event): void => {
    log.debug('[onopen]', ev)
    const control: WebSocketControl = {
      _reconnectTimer: 0,
      send: (message: Message): void => {
        const ws = webSocketRef.current
        if (ws) {
          const json = JSON.stringify(message)
          ws.send(json)
          log.debug('[send]', message)
        }
      },
      reconnect: (): void => {
        log.debug('[WebSocketControl.reconnect] Start.')
        webSocketRef.current?.close()
        createWebSocket(url, onOpen, onClose, onError, onMessage, webSocketRef)
        log.debug('[WebSocketControl.reconnect] End.')
      },
      reconnectWithBackoff: (): void => {
        if (control._reconnectTimer !== 0) {
          log.warn('[reconnectWithBackoff] Already timered:', control._reconnectTimer)
          return
        }
        const waitMillis = 7000 + 13000 * Math.random()
        control._reconnectTimer = window.setTimeout((): void => {
          control._reconnectTimer = 0
          log.info('[reconnectWithBackoff] Try to reconnect.')
          control.reconnect()
        }, waitMillis)
        log.info(`[reconnectWithBackoff] Reconnect after ${waitMillis}ms.`)
      },
      close: (): void => {
        log.debug('[WebSocketControl.close]')
        if (control._reconnectTimer) {
          window.clearTimeout(control._reconnectTimer)
          control._reconnectTimer = 0
        }
        if (webSocketRef.current) {
          webSocketRef.current.close()
          webSocketRef.current = null
        }
      }
    }
    onOpen.listeners.forEach(f => f(control))
    onOpen.control = control
  })
  webSocket.addEventListener('close', (ev: CloseEvent): void => {
    log.debug('[onclose]', ev)
    if (webSocketRef.current) {
      webSocketRef.current.close()
      webSocketRef.current = null
    }
    onClose.listeners.forEach(f => f(ev))
    onOpen.control = null
  })
  webSocket.addEventListener('error', (ev: Event): void => {
    log.debug('[onerror]', ev)
    onError.listeners.forEach(f => f(ev))
  })
  webSocket.addEventListener('message', (ev: MessageEvent<string>): void => {
    log.trace('[onmessage]', ev)
    const message: Message = JSON.parse(ev.data)
    onMessage.listeners.forEach(f => f(message))
  })

  log.info('[createWebSocket] Websocket created.', url)
  webSocketRef.current = webSocket
}

export const useWebSocketEvents = (url: string, noComments: boolean): WebSocketEvents => {
  const webSocketRef = useRef<WebSocket | null>(null)
  const eventsRef = useRef({
    onOpen: new WebSocketOpenEvent(),
    onClose: new BaseWebSocketEvent<(ev: CloseEvent) => void>(),
    onError: new BaseWebSocketEvent<(ev: Event) => void>(),
    onMessage: new BaseWebSocketEvent<(message: Message) => void>(),
  })

  useEffect((): (() => void) => {
    const { onOpen, onClose, onError, onMessage } = eventsRef.current
    if (noComments) {
      log.debug('[useWebSocket] No comments mode.')
      const comment: CommentMessage = {
        type: 'comment',
        comment: 'Entering no comments mode.'
      }
      onMessage.listeners.forEach(f => f(comment))
    }
    createWebSocket(url, onOpen, onClose, onError, onMessage, webSocketRef)

    return (): void => {
      if (webSocketRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        webSocketRef.current.close()
      }
    }
  }, [url, noComments])

  return eventsRef.current
}
