import React from 'react'

import { Message } from './Message'

export type WebSocketClientPropsType = {
  onOpen?: (sender: (message: Message) => void) => void,
  onClose?: (ev: CloseEvent, reconnect: () => void) => void
  onError?: (ev: Event) => void
  onMessage: (message: Message) => void
  url: string
}

export class WebSocketClient extends React.Component<WebSocketClientPropsType> {

  private webSocket: WebSocket | null

  constructor(props: Readonly<WebSocketClientPropsType>) {
    super(props)
    this.webSocket = null
  }

  componentDidMount(): void {
    if (!this.webSocket) {
      this.webSocket = this.createWebSocket()
    }
  }

  componentWillUnmount(): void {
    if (this.webSocket) {
      this.webSocket.close()
      this.webSocket = null
    }
  }

  render(): React.ReactNode {
    return <div></div>;
  }

  send(message: Message): void {
    if (this.webSocket) {
      const json = JSON.stringify(message)
      this.webSocket.send(json)
    }
  }

  close(): void {
    if (this.webSocket) {
      this.webSocket.close()
      this.webSocket = null
    }
  }

  private createWebSocket(): WebSocket {
    const webSocket = new WebSocket(this.props.url)
    webSocket.addEventListener('open', (ev: Event): void => {
      console.log('webSocket open', ev)
      if (this.props.onOpen) {
      this.props.onOpen(this.send.bind(this))
      }
    })
    webSocket.addEventListener('close', (ev: CloseEvent): void => {
      console.log('webSocket close', ev)
      if (this.props.onClose) {
        this.props.onClose(ev, (): void => {
          this.webSocket?.close()
          this.webSocket = this.createWebSocket()
        })
      }
      this.webSocket = null
    })
    webSocket.addEventListener('error', (ev: Event): void => {
      console.log('webSocket error', ev)
      if (this.props.onError) {
        this.props.onError(ev)
      }
    })
    webSocket.addEventListener('message', (ev: MessageEvent<string>): void => {
      const message: Message = JSON.parse(ev.data)
      this.props.onMessage(message)
    })
    return webSocket
  }
}
