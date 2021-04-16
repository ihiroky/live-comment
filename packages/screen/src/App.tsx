import React from 'react'
import './App.css'
import { TextWidthCalculator } from './TextWidthCalculator'
import {
  CloseCode,
  WebSocketClient,
  WebSocketControl,
  Message,
  AcnMessage,
  CommentMessage,
  createHash,
  isCommentMessage
} from 'common'

// TODO data flow should be server -> comment -> screen. A presentater may want to show comment list.

type AppProps = {
  url: string
  room: string
  password: string
  messageDuration: number
}

type Marquee = {
  key: number
  level: number
  comment: string
  ref: React.RefObject<HTMLParagraphElement>
}

type AppState = {
  marquees: Marquee[]
  authFailedCount: number
}

export default class App extends React.Component<AppProps, AppState> {

  private static readonly MAX_MESSAGES = 500

  private webSocketControl: WebSocketControl | null
  private reconnectTimer: number

  constructor(props: Readonly<AppProps>) {
    super(props)
    this.state = {
      marquees: [],
      authFailedCount: 0
    }

    this.onOpen = this.onOpen.bind(this)
    this.onClose = this.onClose.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.webSocketControl = null
    this.reconnectTimer = 0
  }

  private onOpen(control: WebSocketControl): void {
    console.log('onOpen', control)
    const message: AcnMessage = {
      type: 'acn',
      room: this.props.room,
      hash: createHash(this.props.password)
    }
    control.send(message)
    this.webSocketControl = control
  }

  private onClose(ev: CloseEvent): void {
    if (this.webSocketControl) {
      this.webSocketControl.close()
    }
    if (ev.code === CloseCode.ACN_FAILED) {
      const comment: CommentMessage = {
        type: 'comment',
        comment: 'Room authentication failed. Please check your setting 🙏'
      }
      this.onMessage(comment)
      return
    }

    const comment: CommentMessage = {
      type: 'comment',
      comment: `Connection closed: ${ev.code}`
    }
    this.onMessage(comment)

    const waitMillis = 3000 + 7000 * Math.random()
    this.reconnectTimer = window.setTimeout((): void => {
      this.reconnectTimer = 0
      console.log('[onClose] Try to reconnect.')
      this.webSocketControl?.reconnect()
    }, waitMillis)
    console.log(`[onClose] Reconnect after ${waitMillis}ms.`)
  }

  private onMessage(message: Message): void {
    const now = Date.now()
    if (!isCommentMessage(message)) {
      console.log(message)
      return
    }

    const marquees = this.state.marquees.filter(m => now - m.key <= this.props.messageDuration)
    if (marquees.length >= App.MAX_MESSAGES)  {
      console.debug('Dropped:', message.comment)
      return
    }

    const length = marquees.length
    let level = App.calcMinimumEmptyLevel(marquees)
    if (level === -1) {
      level = App.findLevelRightSpaceExists(marquees)
      if (level === -1) {
        level = length > 0 ? marquees[length - 1].level + 1 : 0
      }
    }

    let insertPosition = marquees.length
    if (length > 0 && marquees[length - 1].level >= level) {
      for (let i = marquees.length - 1; i >= 0; i--) {
        if (marquees[i].level === level) {
          insertPosition = i
          break
        }
      }
    }

    marquees.splice(insertPosition, 0, {
      key: now,
      comment: message.comment,
      level: level,
      ref: React.createRef<HTMLParagraphElement>()
    })
    this.setState({ marquees })
  }

  private static calcMinimumEmptyLevel(messages: Marquee[]): number {
    if (messages.length === 0 || messages[0].level > 0) {
      return 0
    }

    let nextLevel = 1
    for (let i = 1; i < messages.length; i++) {
      const m = messages[i]
      if (m.level > nextLevel) {
        return nextLevel
      }
      nextLevel = m.level + 1
    }
    return -1
  }

  private static findLevelRightSpaceExists(marquees: Marquee[]): number {
    if (marquees.length === 0 || marquees[0].level > 0) {
      return 0
    }

    let existsNoRightSpaceMarquee = false
    let prev = marquees[0]
    const windowInnerWidth = window.innerWidth
    for (const m of marquees) {
      if (m.level !== prev.level) {
        if (!existsNoRightSpaceMarquee) {
          return prev.level
        }
        existsNoRightSpaceMarquee = false
      }
      const element = m.ref.current
      if (element) {
        const rect = element.getBoundingClientRect()
        existsNoRightSpaceMarquee = existsNoRightSpaceMarquee || (rect.right >= windowInnerWidth)
      }
      prev = m
    }
    return !existsNoRightSpaceMarquee ? prev.level : -1
  }

  componentWillUnmount(): void {
    this.webSocketControl?.close()
    this.webSocketControl = null
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = 0
    }
  }

  render(): React.ReactNode {
    return (
      <div className="App">
        <div className="message-list">{
          this.state.marquees.map((m: Marquee): React.ReactNode =>
            <p
              className="message"
              key={m.key}
              ref={m.ref}
              style={{
                top: m.level * 60,  // TODO Need to work with css class .App
                animationDuration: this.props.messageDuration + 'ms'
              }}>
              {m.comment}
            </p>
          )
        }</div>
        <WebSocketClient url={this.props.url} onOpen={this.onOpen} onClose={this.onClose} onMessage={this.onMessage} />
      </div>
    );
  }
}
