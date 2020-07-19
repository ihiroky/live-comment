import React from 'react'
import './App.css'
import { WebSocketClient } from 'common'

// TODO data flow should be server -> comment -> screen. A presentater may want to show comment list.

type AppProps = {
  url: string
  messageDuration: number
}

type Message = {
  key: number,
  level: number,
  data: string,
  ref: React.RefObject<HTMLParagraphElement>
}

type AppState = {
  messages: Message[]
}

export default class App extends React.Component<AppProps, AppState> {

  private static readonly MARQUEE_TIMEOUT_MILLIS = 5000

  constructor(props: Readonly<AppProps>) {
    super(props)
    this.state = {
      messages: []
    }

    this.onMessage = this.onMessage.bind(this)
  }

  private onMessage(ev: MessageEvent): void {
    const now = Date.now()
    const messages = this.state.messages.filter(m => now - m.key < App.MARQUEE_TIMEOUT_MILLIS)
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
      for (let i = messages.length - 1; insertPosition >= 0; insertPosition--) {
        if (messages[i].level === level) {
          insertPosition = i + 1
          break
        }
      }
    }
    messages.splice(insertPosition, 0, {
      key: now,
      data: ev.data,
      level: level,
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
        existsNoRightSpaceMessage = existsNoRightSpaceMessage || (rect.left + rect.width >= windowInnerWidth)
      }
      prev = m
    }
    return !existsNoRightSpaceMessage ? prev.level : -1
  }

  render(): React.ReactNode {
    return (
      <div className="App">
        <div className="message-list">{
          this.state.messages.map(
            m => <p className="message" key={m.key} ref={m.ref} style={{ top: m.level * 50 }}>{m.data}</p>
          )
        }</div>
        <WebSocketClient url={this.props.url} onMessage={this.onMessage} />
      </div>
    );
  }
}
