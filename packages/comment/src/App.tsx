import React from 'react'
import './App.css'
import { WebSocketClient, Message } from 'common'
import { SendCommentForm } from './SendCommentForm'

type AppProps = {
  url: string
  maxMessageCount: number
  autoScroll: boolean
}

type AppState = {
  comments: { key: number, comment: string }[]
}

export default class App extends React.Component<AppProps, AppState> {

  private ref: React.RefObject<HTMLDivElement>
  private messageListDiv: Element | null
  private sender: ((message: Message) => void) | null

  constructor(props: Readonly<AppProps>) {
    super(props)
    this.state = {
      comments: []
    }

    this.ref = React.createRef()
    this.messageListDiv = null
    this.sender = null
    this.onOpen = this.onOpen.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.onSubmit = this.onSubmit.bind(this)
  }

  private onOpen(sender: (message: Message) => void): void {
    console.log('onOpen', sender)
    this.sender = sender
  }

  private onMessage(message: Message): void {
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
            { this.state.comments.map(m => <p key={m.key} className="message">{m.comment}</p>) }
            <div ref={this.ref}></div>
          </div>
          <SendCommentForm onSubmit={this.onSubmit} />
        </div>
        <WebSocketClient url={this.props.url} onOpen={this.onOpen} onMessage={this.onMessage} />
      </div>
    )
  }
}
