import React from 'react'
import './App.css'
import {
  CloseCode,
  WebSocketClient,
  WebSocketControl,
  Message,
  AcnMessage,
  isCommentMessage,
  getLogger,
  LogLevels,
} from 'common'
import { SendCommentForm } from './SendCommentForm'
import { isPollStartMessage, isPollFinishMessage, PollMessage, PollEntry } from 'poll'
import { Button } from '@material-ui/core'

type AppProps = {
  url: string
  maxMessageCount: number
  autoScroll: boolean
}

type AppState = {
  comments: {
    key: number,
    comment: string
    pinned: boolean
  }[]
  jsx: JSX.Element[]
}

type AcnState = {
  room: string
  hash: string
  reconnectTimer: number
}

const POLL_START_ID = 'poll-start'
const log = getLogger('App')
log.setLevel(LogLevels.DEBUG)

export default class App extends React.Component<AppProps, AppState> {

  private ref: React.RefObject<HTMLDivElement>
  private messageListDiv: Element | null
  private webSocketControl: WebSocketControl | null
  private acnState: AcnState

  constructor(props: Readonly<AppProps>) {
    super(props)
    this.state = {
      comments: [],
      jsx: [],
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

  private readonly  onPoll = (e: React.MouseEvent<HTMLButtonElement>, choice: PollEntry['key']): void => {
    e.preventDefault()
    const message: PollMessage = {
      type: 'app',
      cmd: 'poll/poll',
      choice,
    }
    this.webSocketControl?.send(message)
  }

  private onMessage(message: Message): void {
    log.debug('[onMessage]', message)
    if (!isCommentMessage(message)
      && !isPollStartMessage(message)
      && !isPollFinishMessage(message)
    ) {
      log.warn('[onMessage] Unexpected message:', message)
      return
    }

    const key = Date.now()
    const jsx = this.state.jsx
    const comments = this.state.comments
    if (isCommentMessage(message)) {
      const comment = message.comment
      const pinned = !!message.pinned
      if (comments.length === this.props.maxMessageCount) {
        comments.unshift()
      }
      comments.push({ key, comment, pinned })
    } else if (isPollStartMessage(message)) {
      jsx.push(
        <p key={key} className="message" id={POLL_START_ID}>
          { message.entries.map(e => (
            <>
              <Button onClick={ev => this.onPoll(ev, e.key)}>{e.key}.</Button>
              <span>{e.description}</span>
            </>
          )) }
        </p>
      )
    } else if (isPollFinishMessage(message)) {
      const dropIndices = jsx.filter(jsx => jsx.props.id === POLL_START_ID).map((_, i) => i)
      for (let i = jsx.length - 1; i >= 0; i--) {
        if (dropIndices.indexOf(i) > -1) {
          jsx.splice(i, 1)
        }
      }
    }

    this.setState({ comments, jsx })
    // TODO Add option to autoscroll
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
            { this.state.jsx }
            <div ref={this.ref}></div>
          </div>
          <SendCommentForm onSubmit={this.onSubmit} />
        </div>
        <WebSocketClient url={this.props.url} onOpen={this.onOpen} onClose={this.onClose} onMessage={this.onMessage} />
      </div>
    )
  }
}
