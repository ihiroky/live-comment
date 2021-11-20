import { MutableRefObject, useEffect, useRef } from 'react'
import { getLogger, CommentMessage, Message } from 'common'

export interface WebSocketControl {
  _reconnectTimer: number
  send(message: Message): void
  reconnect(): void
  reconnectWithBackoff(): void
  close(): void
}

export type WebSocketClientPropsType = {
  onOpen: (control: WebSocketControl) => void
  onClose: (ev: CloseEvent) => void
  onError: (ev: Event) => void
  onMessage: (message: Message) => void
  url: string
  noComments?: boolean
}

type Callbacks = {
  onOpen: WebSocketClientPropsType['onOpen']
  onClose: WebSocketClientPropsType['onClose']
  onError: WebSocketClientPropsType['onError']
  onMessage: WebSocketClientPropsType['onMessage']
}

const log = getLogger('WebSocketClient')

function createWebSocket(
  url: WebSocketClientPropsType['url'],
  callbacksRef: MutableRefObject<Callbacks>,
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
        createWebSocket(url, callbacksRef, webSocketRef)
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
    callbacksRef.current.onOpen(control)
  })
  webSocket.addEventListener('close', (ev: CloseEvent): void => {
    log.debug('[onclose]', ev)
    if (webSocketRef.current) {
      webSocketRef.current.close()
      webSocketRef.current = null
    }
    callbacksRef.current.onClose(ev)
  })
  webSocket.addEventListener('error', (ev: Event): void => {
    log.debug('[onerror]', ev)
    callbacksRef.current.onError(ev)
  })
  webSocket.addEventListener('message', (ev: MessageEvent<string>): void => {
    log.trace('[onmessage]', ev)
    const message: Message = JSON.parse(ev.data)
    callbacksRef.current.onMessage(message)
  })

  log.info('[createWebSocket] Websocket created.', url)
  webSocketRef.current = webSocket
}

export function WebSocketClient(
  { url, noComments, onOpen, onClose, onError, onMessage }: WebSocketClientPropsType
): JSX.Element {
  const webSocketRef = useRef<WebSocket | null>(null)
  const callbacksRef = useRef<Callbacks>({
    onOpen: () => undefined,
    onClose: () => undefined,
    onError: () => undefined,
    onMessage: () => undefined,
  })

  useEffect(() => {
    callbacksRef.current = { onOpen, onClose, onError, onMessage }
  }, [onOpen, onClose, onError, onMessage])

  useEffect((): (() => void) => {
    if (noComments) {
      log.debug('[componentDidMount] No comments mode.')
      const comment: CommentMessage = {
        type: 'comment',
        comment: 'Entering no comments mode.'
      }
      callbacksRef.current.onMessage(comment)
    }
    createWebSocket(url, callbacksRef, webSocketRef)

    return (): void => {
      if (webSocketRef.current) {
        webSocketRef.current.close()
        webSocketRef.current = null
        log.debug('[componentWillUnmount] Websocket closed.')
      }
    }
  }, [url, noComments])

  return <div />
}
