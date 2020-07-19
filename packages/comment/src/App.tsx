import React from 'react'
import './App.css'
import { WebSocketClient } from 'common'
import { SendMessageForm } from './SendMessageForm'

type AppPropsType = {
  url: string
  maxMessageCount: number
  autoScroll: boolean
}

type AppStateType = {
  messages: { key: number, data: string }[]
}

export default class App extends React.Component<AppPropsType, AppStateType> {

  private ref: React.RefObject<HTMLDivElement>
  private messageListDiv: Element | null
  private sender: ((message: string) => void) | null

  constructor(props: Readonly<AppPropsType>) {
    super(props)
    this.state = {
      messages: []
    }

    this.ref = React.createRef()
    this.messageListDiv = null
    this.sender = null
  
    this.onOpen = this.onOpen.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.onSubmit = this.onSubmit.bind(this)
  }

  private onOpen(sender: (message: string) => void): void {
    console.log('onOpen', sender)
    this.sender = sender
  }

  private onMessage(ev: MessageEvent): void {
    const key = Date.now()
    const data = ev.data

    const messages = this.state.messages
    if (messages.length === this.props.maxMessageCount) {
      messages.unshift()
    }
    messages.push({ key, data })
    this.setState({ messages })
    if (this.props.autoScroll && this.ref.current && this.messageListDiv) {
      this.messageListDiv.scrollTo(0, this.ref.current.offsetTop)
    }
  }

  onSubmit(message: string): void {
    if (this.sender) {
      this.sender(message)
    }
  }

  componentDidMount(): void {
    this.messageListDiv = document.getElementsByClassName('message-list')[0]
  }

  render(): React.ReactNode {
    return (
      <div className="App">
        <div className="box">
          <div className="message-list">
            { this.state.messages.map(m => <p key={m.key} className="message">{m.data}</p>) }
            <div ref={this.ref}></div>
          </div>
          <SendMessageForm onSubmit={this.onSubmit} />
        </div>
        <WebSocketClient url={this.props.url} onOpen={this.onOpen} onMessage={this.onMessage} />
      </div>
    )
  }
}

