import React from 'react'

export type AppBasePropsType = {
  messageDuration: number
  maxMessageCount: number
  url: string
  autoScroll?: boolean
}

type AppBaseStateType = {
  messages: { key: number, data: string }[]
}

export class AppBase extends React.Component<AppBasePropsType, AppBaseStateType> {

  private webSocket: WebSocket | null
  private ref: React.RefObject<HTMLDivElement>
  private messageListDiv: Element | null
  private static readonly MARQUEE_DURATION_MILLIS = 5000

  constructor(props: Readonly<AppBasePropsType>) {
    super(props)
    this.state = {
      messages: []
    }
    this.webSocket = null
    this.ref = React.createRef()
    this.messageListDiv = null
  }

  componentDidMount(): void {
    const webSocket = new WebSocket(this.props.url)
    webSocket.addEventListener('open', (ev: Event): void => {
      console.log('webSocket open', ev)
    })
    webSocket.addEventListener('close', (ev: CloseEvent): void => {
      console.log('webSocket close', ev)
      this.webSocket = null
    })
    webSocket.addEventListener('error', (ev: Event): void => {
      console.log('webSocket error', ev)
    })
    webSocket.addEventListener('message', this.onMessage.bind(this))
    this.webSocket = webSocket
    this.messageListDiv = document.getElementsByClassName('message-list')[0]
  }

  private onMessage(ev: MessageEvent): void {
    const key = Date.now()
    const data = ev.data
    const messages = this.state.messages
    if (this.updateMessageList(key, data)) {
      return
    }
    this.insertMessage(key, data)
  }

  private updateMessageList(key: number, data: string): boolean {
    const messages = this.state.messages
    for (const m of messages) {
      if (key - m.key > this.props.messageDuration) {
        m.key = key
        m.data = data
        this.setState({
          messages
        })
        return true
      }
    }
    return false
  }

  private insertMessage(key: number, data: string): void {
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

  componentWillUnmount(): void {
    if (this.webSocket) {
      this.webSocket.close()
      this.webSocket = null
    }
  }

  render(): React.ReactNode {
    return (
      <div className="message-list">
        { this.state.messages.map(m => <p key={m.key} className="message">{m.data}</p>) }
        <div ref={this.ref}></div>
      </div>
    );
  }

  send(message: string): void {
    if (this.webSocket) {
      this.webSocket.send(message)
    }
  }
}
