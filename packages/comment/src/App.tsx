import React from 'react'
import './App.css'
import {
  assertNotNullable,
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
import {
  isPollStartMessage,
  isPollFinishMessage,
  PollMessage,
  PollEntry,
  PollStartMessage,
} from 'poll'
import {
  Button,
} from '@material-ui/core'

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
  polls: {
    key: number
    owner: string
    id: PollStartMessage['id']
    title: PollStartMessage['title']
    entries: PollStartMessage['entries']
  }[]
}

type AcnState = {
  room: string
  hash: string
  reconnectTimer: number
}

const log = getLogger('App')
log.setLevel(LogLevels.DEBUG)

// TODO User should be able to restart poll if the poll entry is closed by mistake.

type PollControlProps = {
  poll: AppState['polls'][number],
  onPoll: (e: React.MouseEvent<HTMLButtonElement>, choice: PollEntry['key'], owner: string) => void,
  onClosePoll: (pollId: string) => void
}

const PollControl: React.FC<PollControlProps> = ({ poll, onPoll, onClosePoll }: PollControlProps): JSX.Element => {
  return (
    <div className="message">
      <div>Presenter starts a poll!!! [id:{poll.id}] Click the number you choose.</div>
      <div style={{ fontWeight: 'bold', padding: '8px' }}>{poll.title}</div>
      {
        poll.entries.map((e: Pick<PollEntry, 'key' | 'description'>, i: number) => (
          <div key={`poll-${poll.key}-${e.key}`}>
            <Button variant="outlined" onClick={ev => onPoll(ev, e.key, poll.owner)}>{i}</Button>
            <span style={{ marginLeft: '8px' }}>{e.description}</span>
          </div>
        ))
      }
      <div>
        <Button
          variant="outlined"
          style={{ marginTop: '4px' }}
          onClick={() => onClosePoll(poll.id)}
        >
          Close
        </Button>
      </div>
    </div>
  )
}

export default class App extends React.Component<AppProps, AppState> {

  private ref: React.RefObject<HTMLDivElement>
  private messageListDiv: Element | null
  private webSocketControl: WebSocketControl | null
  private acnState: AcnState

  constructor(props: Readonly<AppProps>) {
    super(props)
    this.state = {
      comments: [],
      polls: [],
    }

    this.ref = React.createRef()
    this.messageListDiv = null
    this.webSocketControl = null
    this.acnState = { room: '', hash: '', reconnectTimer: 0 }
  }

  private onOpen = (control: WebSocketControl): void => {
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

  private onClose = (ev: CloseEvent): void => {
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

  private readonly onPoll = (e: React.MouseEvent<HTMLButtonElement>, choice: PollEntry['key'], to: string): void => {
    e.preventDefault()
    const message: PollMessage = {
      type: 'app',
      cmd: 'poll/poll',
      to,
      choice,
    }
    log.debug('[onPoll] ', message)
    this.webSocketControl?.send(message)
  }

  private onMessage = (message: Message): void => {
    log.debug('[onMessage]', message)
    if (!isCommentMessage(message)
      && !isPollStartMessage(message)
      && !isPollFinishMessage(message)
    ) {
      log.warn('[onMessage] Unexpected message:', message)
      return
    }

    const key = Date.now()
    const polls = this.state.polls
    const comments = this.state.comments
    if (isCommentMessage(message)) {
      const comment = message.comment
      const pinned = !!message.pinned
      if (comments.length === this.props.maxMessageCount) {
        comments.unshift()
      }
      comments.push({ key, comment, pinned })
    } else if (isPollStartMessage(message)) {
      assertNotNullable(message.from, 'PollStartMessage.from')
      polls.push({
        key,
        owner: message.from,
        id: message.id,
        title: message.title,
        entries: message.entries,
      })
    } else if (isPollFinishMessage(message)) {
      this.closePoll(message.id, false)
      const dropIndex = polls.findIndex(poll => poll.id === message.id)
      if (dropIndex > -1) {
        polls.splice(dropIndex, 1)
      }
    }

    this.setState({ comments, polls })
    // TODO Add option to autoscroll
    if (this.props.autoScroll && this.ref.current && this.messageListDiv) {
      this.messageListDiv.scrollTo(0, this.ref.current.offsetTop)
    }
  }

  private closePoll = (pollId: string, refresh: boolean): void => {
    const polls = this.state.polls
    const dropIndex = polls.findIndex(poll => poll.id === pollId)
    if (dropIndex > -1) {
      polls.splice(dropIndex, 1)
      if (refresh) {
        this.setState({
          comments: this.state.comments,
          polls,
        })
      }
    }
  }

  private onSubmit = (message: Message): void => {
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
            {
              this.state.comments.map(
                (m: AppState['comments'][number]) => <p key={m.key} className="message">{m.comment}</p>
              )
            }
            {
              this.state.polls.map(poll =>
                <PollControl
                  key={poll.key}
                  poll={poll}
                  onPoll={this.onPoll}
                  onClosePoll={pollId => this.closePoll(pollId, true)}
                />
              )
            }
            <div ref={this.ref}></div>
          </div>
          <SendCommentForm onSubmit={this.onSubmit} />
        </div>
        <WebSocketClient url={this.props.url} onOpen={this.onOpen} onClose={this.onClose} onMessage={this.onMessage} />
      </div>
    )
  }
}
