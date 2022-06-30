import { getLogger, LogLevels } from '@/common/Logger'
import { Message } from '@/common/Message'
import { useEffect,  useState } from 'react'

type ReconnectableWebSocketEventMap = {
  "close": CloseEvent
  "error": Event
  "message": Message
  "open": void
}

export type ReconnectableWebSocket = {
  send: (message: Message) => void
  reconnect: () => void
  reconnectWithBackoff: () => void
  close: () => void
  get readyState(): number
  get url(): string
  addEventListener: <K extends keyof ReconnectableWebSocketEventMap>(
    type: K,
    listener: (ev: ReconnectableWebSocketEventMap[K]) => void
  ) => void
  removeEventListener: <K extends keyof ReconnectableWebSocketEventMap>(
    type: K,
    listener: (ev: ReconnectableWebSocketEventMap[K]) => void
  ) => void
}

const log = getLogger('ws')
log.setLevel(LogLevels.INFO)

export function createReconnectableWebSocket(url: string): ReconnectableWebSocket {
  if (!/^wss?:\/\/./.test(url)) {
    throw new Error('Invalid URL')
  }

  let reconnectTimer = 0
  const onOpenListeners: Array<(e: ReconnectableWebSocketEventMap['open']) => void> = []
  const onCloseListeners: Array<(e: ReconnectableWebSocketEventMap['close']) => void> = []
  const onErrorListeners: Array<(e: ReconnectableWebSocketEventMap['error']) => void> = []
  const onMessageListeners: Array<(e: ReconnectableWebSocketEventMap['message']) => void> = []
  const setUpListeners = (ws: WebSocket): void => {
    ws.addEventListener('open', (): void => {
      log.debug('[onopen]')
      onOpenListeners.forEach(f => f())
    })
    ws.addEventListener('close', (e: CloseEvent): void => {
      log.debug('[onclose]', e)
      onCloseListeners.forEach(f => f(e))
    })
    ws.addEventListener('error', (e: Event): void => {
      log.debug('[onerror]', e)
      onErrorListeners.forEach(f => f(e))
    })
    ws.addEventListener('message', (e: MessageEvent): void => {
      log.debug('[onmessage]', e)
      const message: Message = JSON.parse(e.data)
      onMessageListeners.forEach(f => f(message))
    })
  }

  let webSocket = new WebSocket(url)
  setUpListeners(webSocket)

  const rws: ReconnectableWebSocket = {
    send: (message: Message): void => {
      if (webSocket.readyState === WebSocket.OPEN) {
        const json = JSON.stringify(message)
        webSocket.send(json)
        log.debug('[send]', message)
      }
    },
    reconnect: (): void => {
      log.debug('[WebSocketControl.reconnect] Start.')
      webSocket.close()
      webSocket = new WebSocket(url)
      setUpListeners(webSocket)
      log.debug('[WebSocketControl.reconnect] End.')
    },
    reconnectWithBackoff: (): void => {
      if (reconnectTimer !== 0) {
        log.warn('[reconnectWithBackoff] Already timered:', reconnectTimer)
        return
      }
      const waitMillis = 7000 + 13000 * Math.random()
      reconnectTimer = window.setTimeout((): void => {
        reconnectTimer = 0
        log.info('[reconnectWithBackoff] Try to reconnect.')
        rws.reconnect()
      }, waitMillis)
      log.info(`[reconnectWithBackoff] Reconnect after ${waitMillis}ms.`)
    },
    close: (): void => {
      log.debug('[ReconnectableWebSocket.close]')
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
        reconnectTimer = 0
      }
      webSocket.close()
    },
    get readyState(): number {
      return webSocket.readyState
    },
    get url(): string {
      return webSocket.url
    },
    addEventListener: <K extends keyof ReconnectableWebSocketEventMap>(
      type: K,
      listener: (e: ReconnectableWebSocketEventMap[K]) => void
    ): void => {
      switch (type) {
        case 'open':
          onOpenListeners.push(listener as (e: ReconnectableWebSocketEventMap['open']) => void)
          break
        case 'close':
          onCloseListeners.push(listener as (e: ReconnectableWebSocketEventMap['close']) => void)
          break
        case 'error':
          onErrorListeners.push(listener as (e: ReconnectableWebSocketEventMap['error']) => void)
          break
        case 'message':
          onMessageListeners.push(listener as (e: ReconnectableWebSocketEventMap['message']) => void)
      }
    },
    removeEventListener: <K extends keyof ReconnectableWebSocketEventMap>(
      type: K,
      listener: (ev: ReconnectableWebSocketEventMap[K]) => void
    ): void => {
      switch (type) {
        case 'open': {
          const i = onOpenListeners.indexOf(listener as (e: ReconnectableWebSocketEventMap['open']) => void)
          i >= 0 && onOpenListeners.splice(i, 1)
        } break
        case 'close': {
          const i = onCloseListeners.indexOf(listener as (e: ReconnectableWebSocketEventMap['close']) => void)
          i >= 0 && onCloseListeners.splice(i, 1)
        } break
        case 'error': {
          const i = onErrorListeners.indexOf(listener as (e: ReconnectableWebSocketEventMap['error']) => void)
          i >= 0 && onErrorListeners.splice(i, 1)
        } break
        case 'message': {
          const i = onMessageListeners.indexOf(listener as (e: ReconnectableWebSocketEventMap['message']) => void)
          i >= 0 && onMessageListeners.splice(i, 1)
        } break
      }
    },
  }

  log.info('[createReconnectableWebSocket] Websocket created.', url)
  return rws
}

export const useReconnectableWebSocket = (url: string, noComment: boolean): ReconnectableWebSocket | null => {
  const [rws, setRws] = useState<ReconnectableWebSocket | null>(null)

  useEffect((): (() => void) => {
    if (noComment) {
      log.info('[useReconnectableWebSocket] No comment mode ON.')
      return () => undefined
    }

    // Add delay to suppress errors on StrictMode.
    let timeout = 0
    if (!rws) {
      timeout = window.setTimeout((): void => {
        const newRws = createReconnectableWebSocket(url)
        timeout = 0
        setRws(newRws)
      }, 100)
    }

    return (): void => {
      if (timeout) {
        window.clearTimeout(timeout)
      }
      if (rws) {
        log.debug('[useEffect] unmount')
        rws.close()
        setRws(null)
      }
    }
  }, [url, noComment, rws])

  return rws
}
