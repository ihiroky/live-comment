import React from 'react'
import './App.css'
import { WebSocketClient } from 'common'

// TODO show screen with Electron.
// TODO data flow should be server -> comment -> screen. A presentater may want to show comment list.

type AppPropsType = {
  url: string
  messageDuration: number
}

type AppStateType = {
  messages: { key: number, data: string }[]
}

export default class App extends React.Component<AppPropsType, AppStateType> {

  constructor(props: Readonly<AppPropsType>) {
    super(props)
    this.state = {
      messages: []
    }
    this.onMessage = this.onMessage.bind(this)
  }

  private onMessage(ev: MessageEvent): void {
    const key = Date.now()
    const data = ev.data

    const messages = this.state.messages
    for (const m of messages) {
      if (key - m.key > this.props.messageDuration) {
        m.key = key
        m.data = data
        this.setState({
          messages
        })
        return
      }
    }
    messages.push({ key, data })
    this.setState({ messages })
  }

  render(): React.ReactNode {
    // TODO prepare for message storm (overlap with :nth-child)
    return (
      <div className="App">
        <div className="message-list">
          { this.state.messages.map(m => <p key={m.key} className="message">{m.data}</p>) }
        </div>
        <WebSocketClient url={this.props.url} onMessage={this.onMessage} />
      </div>
    );
  }
}
