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
} from 'common'
import { SendCommentForm } from './SendCommentForm'
import {
  isPollStartMessage,
  isPollFinishMessage,
  PollMessage,
  PollEntry,
} from 'poll'
import { AppState } from './types'
import { PollControl } from './PollControl'
import { LabeledCheckbox } from './LabeledCheckbox'
import { FormGroup } from '@material-ui/core'

type AppProps = {
  url: string
  maxMessageCount: number
}

type AcnState = {
  room: string
  hash: string
}

const log = getLogger('App')

// TODO User should be able to restart poll if the poll entry is closed by mistake.

export const App: React.FC<AppProps> = (props: AppProps): JSX.Element => {
  const [state, setState] = React.useState<AppState>({
    comments: [],
    polls: [],
    autoScroll: true,
    sendWithCtrlEnter: true, // TODO Store to cookie
  })
  const ref = React.useRef<HTMLDivElement>(null)
  const messageListDivRef = React.useRef<Element | null>(null)
  const wscRef = React.useRef<WebSocketControl | null>(null)
  const acnStateRef = React.useRef<AcnState>({ room: '', hash: '' })

  const onOpen = (wsc: WebSocketControl): void => {
    log.debug('[onOpen]', wsc)
    const acnState = acnStateRef.current
    if (acnState.room.length === 0 || acnState.hash.length === 0) {
      window.location.href = './login'
      return

    }

    wscRef.current = wsc
    const acn: AcnMessage = {
      type: 'acn',
      ...acnState
    }
    wsc.send(acn)
  }
  const onClose = (ev: CloseEvent): void => {
    switch (ev.code) {
      case CloseCode.ACN_FAILED:
        window.localStorage.setItem('App.notification', JSON.stringify({ message: 'Authentication failed.' }))
        window.location.href = './login'
        break
      default:
        wscRef.current?.reconnectWithBackoff()
        break
    }
  }
  const onPoll = (e: React.MouseEvent<HTMLButtonElement>, choice: PollEntry['key'], to: string): void => {
    e.preventDefault()
    const message: PollMessage = {
      type: 'app',
      cmd: 'poll/poll',
      to,
      choice,
    }
    log.debug('[onPoll] ', message)
    wscRef.current?.send(message)
  }
  const onMessage = (message: Message): void => {
    log.debug('[onMessage]', message)
    if (!isCommentMessage(message)
      && !isPollStartMessage(message)
      && !isPollFinishMessage(message)
    ) {
      log.warn('[onMessage] Unexpected message:', message)
      return
    }

    const key = Date.now()
    const polls = state.polls
    const comments = state.comments
    console.log(message)
    if (isCommentMessage(message)) {
      const comment = message.comment
      const pinned = !!message.pinned
      if (comments.length === props.maxMessageCount) {
        comments.unshift()
      }
      console.log('BEFORE PUSH', key, comment, pinned)
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
      closePoll(message.id, false)
      const dropIndex = polls.findIndex(poll => poll.id === message.id)
      if (dropIndex > -1) {
        polls.splice(dropIndex, 1)
      }
    }
    setState({...state, comments, polls})
    console.log(key, polls, comments)
    const messageListDiv = messageListDivRef.current
    if (state.autoScroll && ref.current && messageListDiv) {
      messageListDiv.scrollTo(0, ref.current.offsetTop)
    }
  }
  const closePoll = (pollId: string, refresh: boolean): void => {
    const polls = state.polls
    const dropIndex = polls.findIndex(poll => poll.id === pollId)
    if (dropIndex > -1) {
      polls.splice(dropIndex, 1)
      if (refresh) {
        setState({...state, polls})
      }
    }
  }
  const onSubmit = (message: Message): void => {
    wscRef.current?.send(message)
  }

  const onChangeAutoScroll = (autoScroll: boolean): void => {
    setState({
      ...state,
      autoScroll
    })
  }
  const onChangeSendWithCtrlEnter = (sendWithShiftEnter: boolean): void => {
    setState({
      ...state,
      sendWithCtrlEnter: sendWithShiftEnter
    })
  }

  React.useEffect((): (() => void) => {
    log.debug('[componentDidMount]')
    messageListDivRef.current = document.getElementsByClassName('message-list')[0]
    const json = window.localStorage.getItem('LoginForm.credential')
    if (!json) {
      window.location.href = './login'
      return () => undefined
    }
    const loginConfig = JSON.parse(json)
    log.debug('[componentDidMount]', loginConfig)
    acnStateRef.current.room = loginConfig.room
    acnStateRef.current.hash = loginConfig.hash
    window.localStorage.removeItem('LoginForm.credential')

    return (): void => {
      log.debug('[componentWillUnmount]')
      if (wscRef.current) {
        wscRef.current.close()
        wscRef.current = null
      }
    }
  }, [])
  return (
    <div className="App">
      <div className="box">
        <div className="message-list">
          {
            state.comments.map(
              (m: AppState['comments'][number]) => <p key={m.key} className="message">{m.comment}</p>
            )
          }
          {
            state.polls.map(poll =>
              <PollControl
                key={poll.key}
                poll={poll}
                onPoll={onPoll}
                onClosePoll={pollId => closePoll(pollId, true)}
              />
            )
          }
          <div ref={ref}></div>
        </div>
        <SendCommentForm onSubmit={onSubmit} sendWithCtrlEnter={state.sendWithCtrlEnter} />
        <form>
          <div className="options">
            <FormGroup row>
              <LabeledCheckbox
                label="Auto scroll"
                checked={state.autoScroll}
                onChange={onChangeAutoScroll}
              />
              <LabeledCheckbox
                label="Send with Ctrl+Enter"
                checked={state.sendWithCtrlEnter}
                onChange={onChangeSendWithCtrlEnter}
              />
            </FormGroup>
          </div>
        </form>
      </div>
      <WebSocketClient url={props.url} onOpen={onOpen} onClose={onClose} onMessage={onMessage} />
    </div>
  )
}
