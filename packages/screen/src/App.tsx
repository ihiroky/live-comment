import React from 'react'
import './App.css'
import { TextWidthCalculator } from './TextWidthCalculator'
import {
  WebSocketClient,
  Message,
  CommentMessage,
  AcnMessage,
  ErrorMessage,
  createHash,
  isCommentMessage,
  isErrorMessage
} from 'common'

// TODO data flow should be server -> comment -> screen. A presentater may want to show comment list.

type AppProps = {
  url: string
  room: string
  password: string
  marqueeDuration: number
}

type Marquee = {
  key: number
  level: number
  comment: string
  duration: number
  ref: React.RefObject<HTMLParagraphElement>
}

type AppState = {
  marquees: Marquee[]
  authFailedCount: number
}

const MAX_ACN_FAILED = 3

export default class App extends React.Component<AppProps, AppState> {

  private static readonly SLIDE_PIXEL_PER_SECOND = 250
  private static readonly MAX_MESSAGES = 500
  private static readonly TWC_ID = 'app_twc'

  private reconnectTimer: NodeJS.Timeout | null

  constructor(props: Readonly<AppProps>) {
    super(props)
    this.state = {
      marquees: [],
      authFailedCount: 0
    }

    this.onOpen = this.onOpen.bind(this)
    this.onClose = this.onClose.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.reconnectTimer = null
  }

  private onOpen(sender: (message: AcnMessage) => void): void {
    console.log('onOpen', sender)
    const message: AcnMessage = {
      type: 'acn',
      room: this.props.room,
      hash: createHash(this.props.password)
    }
    sender(message)
  }

  private onClose(ev: CloseEvent, reconnect: () => void): void {
    /*
    if (this.state.authFailedCount <= MAX_ACN_FAILED) {
      this.reconnectTimer = setTimeout(reconnect, 5000)
      return
    }
    console.error('Authentication failed. Reload if retry.')
    */
  }

  private onMessage(message: Message): void {
    const now = Date.now()
    if (isErrorMessage(message)) {
      if (message.error === 'ACN_FAILED') {
        const newState = {
          marquees: this.state.marquees,
          authFailedCount: this.state.authFailedCount + 1
        }
        console.error(message.error, this.state.authFailedCount)
        this.setState(newState)
      }
      return
    }
    if (!isCommentMessage(message)) {
      console.log(message)
      return
    }

    const marquees = this.state.marquees.filter(m => now - m.key <= m.duration)
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

    const textWidth = TextWidthCalculator.calculateWidth(message.comment, App.TWC_ID)
    const durationMillis = Math.round((window.innerWidth + textWidth) / App.SLIDE_PIXEL_PER_SECOND * 1000)
    marquees.splice(insertPosition, 0, {
      key: now,
      comment: message.comment,
      level: level,
      duration: durationMillis,
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
                top: m.level * 50,
                animationDuration: m.duration + 'ms'
              }}>
              {m.comment}
            </p>
          )
        }</div>
        <WebSocketClient url={this.props.url} onOpen={this.onOpen} onMessage={this.onMessage} />
        <TextWidthCalculator id={App.TWC_ID} />
      </div>
    );
  }
}
