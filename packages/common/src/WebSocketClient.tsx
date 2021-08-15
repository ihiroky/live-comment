import React from 'react'
import { getLogger } from './Logger'

import { CommentMessage, Message } from './Message'

export interface WebSocketControl {
  _reconnectTimer: number
  send(message: Message): void
  reconnect(): void
  reconnectWithBackoff(): void
  close(): void
}

export type WebSocketClientPropsType = {
  onOpen?: (control: WebSocketControl) => void
  onClose?: (ev: CloseEvent) => void
  onError?: (ev: Event) => void
  onMessage: (message: Message) => void
  url: string
  noComments?: boolean
}

const log = getLogger('WebSocketClient')

export class WebSocketClient extends React.Component<WebSocketClientPropsType> {

  private webSocket: WebSocket | null

  constructor(props: Readonly<WebSocketClientPropsType>) {
    super(props)
    this.webSocket = null
  }

  componentDidMount(): void {
    if (this.props.noComments) {
      log.debug('[componentDidMount] No comments mode.')
      const comment: CommentMessage = {
        type: 'comment',
        comment: 'Entering no comments mode.'
      }
      this.props.onMessage(comment)
    }
    if (!this.webSocket) {
      this.webSocket = this.createWebSocket()
    }
  }

  componentWillUnmount(): void {
    if (this.webSocket) {
      this.webSocket.close()
      this.webSocket = null
      log.debug('[componentWillUnmount] Websocket closed.')
    }
  }

  render(): React.ReactNode {
    return <div></div>
  }

  private createWebSocket(): WebSocket {
    const webSocket = new WebSocket(this.props.url)
    webSocket.addEventListener('open', (ev: Event): void => {
      log.debug('[onopen]', ev)
      if (this.props.onOpen) {
        const control: WebSocketControl = {
          _reconnectTimer: 0,
          send: (message: Message): void => {
            if (this.webSocket) {
              const json = JSON.stringify(message)
              this.webSocket.send(json)
              log.trace('[send]', message)
            }
          },
          reconnect: (): void => {
            log.debug('[WebSocketControl.reconnect] Start.')
            this.webSocket?.close()
            this.webSocket = this.createWebSocket()
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
            if (this.webSocket) {
              this.webSocket.close()
              this.webSocket = null
            }
          }
        }
        this.props.onOpen(control)
      }
    })
    webSocket.addEventListener('close', (ev: CloseEvent): void => {
      log.debug('[onclose]', ev)
      if (this.webSocket) {
        this.webSocket.close()
        this.webSocket = null
      }
      if (this.props.onClose) {
        this.props.onClose(ev)
      }
    })
    webSocket.addEventListener('error', (ev: Event): void => {
      log.debug('[onerror]', ev)
      if (this.props.onError) {
        this.props.onError(ev)
      }
    })
    webSocket.addEventListener('message', (ev: MessageEvent<string>): void => {
      log.trace('[onmessage]', ev)
      const message: Message = JSON.parse(ev.data)
      this.props.onMessage(message)
    })

    log.info('[createWebSocket] Websocket created.', this.props.url)
    return webSocket
  }
}
