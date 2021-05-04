import React from 'react'
import './App.css'
import {
  CloseCode,
  WebSocketClient,
  WebSocketControl,
  Message,
  AcnMessage,
  isCommentMessage,
  getLogger
} from 'common'
import { SendCommentForm } from './SendCommentForm'

type AppProps = {
  url: string
  maxMessageCount: number
  autoScroll: boolean
}

type AppState = {
  comments: { key: number, comment: string }[]
}

type AcnState = {
  room: string
  hash: string
  reconnectTimer: number
}

const log = getLogger('App')

export default class App extends React.Component<AppProps, AppState> {

  private ref: React.RefObject<HTMLDivElement>
  private messageListDiv: Element | null
  private webSocketControl: WebSocketControl | null
  private acnState: AcnState

  constructor(props: Readonly<AppProps>) {
    super(props)
    this.state = {
      comments: []
    }

    this.ref = React.createRef()
    this.messageListDiv = null
    this.webSocketControl = null
    this.acnState = { room: '', hash: '', reconnectTimer: 0 }
    this.onOpen = this.onOpen.bind(this)
    this.onClose = this.onClose.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.onSubmit = this.onSubmit.bind(this)
  }

  private onOpen(control: WebSocketControl): void {
    log.debug('[onOpen]', control)
    if (this.acnState.room.length === 0 || this.acnState.hash.length === 0) {
      window.location.href = './login'
      return

    }

    this.webSocketControl = control
    const acn: AcnMessage = {
      type: 'acn',
      room: this.acnState.room,
      hash: this.acnState.hash
    }
    this.webSocketControl.send(acn)
  }

  private onClose(ev: CloseEvent): void {
    if (this.webSocketControl) {
      this.webSocketControl.close()
    }
    switch (ev.code) {
      case CloseCode.ACN_FAILED:
        window.localStorage.setItem('App.notification', JSON.stringify({ message: 'Authentication failed.' }))
        window.location.href = './login'
        break
      default:
        const waitMillis = 3000 + 7000 * Math.random()
        this.acnState.reconnectTimer = window.setTimeout((): void => {
          this.acnState.reconnectTimer = 0
          log.info('[onClose] Try to reconnect.')
          this.webSocketControl?.reconnect()
        }, waitMillis)
        log.debug(`[onClose] Reconnect after ${waitMillis}ms.`)
        break
    }
  }

  private onMessage(message: Message): void {
    if (!isCommentMessage(message)) {
      log.warn('[onMessage] Unexpected message:', message)
      return
    }
    const key = Date.now()
    const comment = message.comment

    const comments = this.state.comments
    if (comments.length === this.props.maxMessageCount) {
      comments.unshift()
    }
    comments.push({ key, comment })
    this.setState({ comments })
    if (this.props.autoScroll && this.ref.current && this.messageListDiv) {
      this.messageListDiv.scrollTo(0, this.ref.current.offsetTop)
    }
  }

  onSubmit(message: Message): void {
    this.webSocketControl?.send(message)
  }

  componentDidMount(): void {
    log.debug('[componentDidMount]')
    this.messageListDiv = document.getElementsByClassName('message-list')[0]

    const json = window.localStorage.getItem('LoginForm.credential')
    if (!json) {
      window.location.href = './login'
      return
    }
    const loginConfig = JSON.parse(json)
    log.debug('[componentDidMount]', loginConfig)
    this.acnState.room = loginConfig.room
    this.acnState.hash = loginConfig.hash
    window.localStorage.removeItem('LoginForm.credential')
  }

  componentWillUnmount(): void {
    log.debug('[componentWillUnmount]')
    this.webSocketControl?.close()
    this.webSocketControl = null
    if (this.acnState.reconnectTimer) {
      window.clearTimeout(this.acnState.reconnectTimer)
      this.acnState.reconnectTimer = 0
    }
  }

  render(): React.ReactNode {
    return (
      <div className="App">
        <div className="box">
          <div className="message-list">
            { this.state.comments.map(m => <p key={m.key} className="message">{m.comment}</p>) }
            <div ref={this.ref}></div>
          </div>
          <SendCommentForm onSubmit={this.onSubmit} />
        </div>
        <WebSocketClient url={this.props.url} onOpen={this.onOpen} onClose={this.onClose} onMessage={this.onMessage} />
      </div>
    )
  }
}
