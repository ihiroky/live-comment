import React from 'react'
import './App.css'
import { TextWidthCalculator } from './TextWidthCalculator'
import { WebSocketClient } from 'common'

// TODO data flow should be server -> comment -> screen. A presentater may want to show comment list.

type AppProps = {
  url: string
  messageDuration: number
}

type Message = {
  key: number
  level: number
  data: string
  duration: number
  ref: React.RefObject<HTMLParagraphElement>
}

type AppState = {
  messages: Message[]
}

export default class App extends React.Component<AppProps, AppState> {

  private static readonly SLIDE_PIXEL_PER_SECOND = 250
  private static readonly MAX_MESSAGES = 500
  private static readonly TWC_ID = 'app_twc'

  constructor(props: Readonly<AppProps>) {
    super(props)
    this.state = {
      messages: []
    }

    this.onMessage = this.onMessage.bind(this)
  }

  private onMessage(ev: MessageEvent): void {
    const now = Date.now()
    const messages = this.state.messages.filter(m => now - m.key <= m.duration)
    if (messages.length >= App.MAX_MESSAGES)  {
      console.debug('Dropped:', ev.data)
      return
    }

    const length = messages.length
    let level = App.calcMinimumEmptyLevel(messages)
    if (level === -1) {
      level = App.findLevelRightSpaceExists(messages)
      if (level === -1) {
        level = length > 0 ? messages[length - 1].level + 1 : 0
      }
    }

    let insertPosition = messages.length
    if (length > 0 && messages[length - 1].level >= level) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].level === level) {
          insertPosition = i
          break
        }
      }
    }

    const textWidth = TextWidthCalculator.calculateWidth(ev.data, App.TWC_ID)
    const durationMillis = Math.round((window.innerWidth + textWidth) / App.SLIDE_PIXEL_PER_SECOND * 1000)
    messages.splice(insertPosition, 0, {
      key: now,
      data: ev.data,
      level: level,
      duration: durationMillis,
      ref: React.createRef<HTMLParagraphElement>()
    })
    this.setState({ messages })
  }

  private static calcMinimumEmptyLevel(messages: Message[]): number {
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

  private static findLevelRightSpaceExists(messages: Message[]): number {
    if (messages.length === 0 || messages[0].level > 0) {
      return 0
    }

    let existsNoRightSpaceMessage = false
    let prev = messages[0]
    const windowInnerWidth = window.innerWidth
    for (const m of messages) {
      if (m.level !== prev.level) {
        if (!existsNoRightSpaceMessage) {
          return prev.level
        }
        existsNoRightSpaceMessage = false
      }
      const element = m.ref.current
      if (element) {
        const rect = element.getBoundingClientRect()
        existsNoRightSpaceMessage = existsNoRightSpaceMessage || (rect.right >= windowInnerWidth)
      }
      prev = m
    }
    return !existsNoRightSpaceMessage ? prev.level : -1
  }

  render(): React.ReactNode {
    return (
      <div className="App">
        <div className="message-list">{
          this.state.messages.map((m: Message): React.ReactNode =>
            <p
              className="message"
              key={m.key}
              ref={m.ref}
              style={{
                top: m.level * 50,
                animationDuration: m.duration + 'ms'
              }}>
              {m.data}
            </p>
          )
        }</div>
        <WebSocketClient url={this.props.url} onMessage={this.onMessage} />
        <TextWidthCalculator id={App.TWC_ID} />
      </div>
    );
  }
}
