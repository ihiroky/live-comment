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
  createHash,
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
import { FormGroup, Link } from '@material-ui/core'
import { useAppCookies, FAR_ENOUGH } from './useAppCookies'

type AppProps = {
  url: string
  maxMessageCount: number
}

const log = getLogger('App')

// TODO User should be able to restart poll if the poll entry is closed by mistake.

function goToLoginPage(): void {
  window.location.href = './login'
}

export const App: React.FC<AppProps> = (props: AppProps): JSX.Element => {
  const [cookies, modCookies] = useAppCookies()
  // TODO Divide state
  const autoScroll = cookies.bool('autoScroll')
  const sendWithCtrlEnter = cookies.bool('sendWithCtrlEnter')
  const [state, setState] = React.useState<AppState>({
    comments: [],
    polls: [],
    autoScroll: (autoScroll === undefined) || autoScroll,
    sendWithCtrlEnter: (sendWithCtrlEnter === undefined) || sendWithCtrlEnter,
  })
  const ref = React.useRef<HTMLDivElement>(null)
  const messageListDivRef = React.useRef<Element | null>(null)
  const wscRef = React.useRef<WebSocketControl | null>(null)

  const onOpen = React.useCallback((wsc: WebSocketControl): void => {
    log.debug('[onOpen]', wsc)
    const room = cookies.str('room')
    const password = cookies.str('password')
    if (!room || !password) {
      return
    }

    wscRef.current = wsc
    const acn: AcnMessage = {
      type: 'acn',
      room: room,
      hash: createHash(password),
    }
    wsc.send(acn)
  }, [cookies])
  const onClose = React.useCallback((ev: CloseEvent): void => {
    switch (ev.code) {
      case CloseCode.ACN_FAILED:
        modCookies.remove('room')
        modCookies.remove('password')
        window.localStorage.setItem('App.notification', JSON.stringify({ message: 'Authentication failed.' }))
        goToLoginPage()
        break
      default:
        wscRef.current?.reconnectWithBackoff()
        break
    }
  }, [modCookies])
  const onPoll = React.useCallback((e: React.MouseEvent<HTMLButtonElement>, choice: PollEntry['key'], to: string): void => {
    e.preventDefault()
    const message: PollMessage = {
      type: 'app',
      cmd: 'poll/poll',
      to,
      choice,
    }
    log.debug('[onPoll] ', message)
    wscRef.current?.send(message)
  }, [])
  const closePoll = React.useCallback((pollId: string, refresh: boolean): void => {
    const polls = state.polls
    const dropIndex = polls.findIndex(poll => poll.id === pollId)
    if (dropIndex > -1) {
      polls.splice(dropIndex, 1)
      if (refresh) {
        setState({...state, polls})
      }
    }
  }, [state])
  const onMessage = React.useCallback((message: Message): void => {
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
    if (isCommentMessage(message)) {
      const comment = message.comment
      const pinned = !!message.pinned
      if (comments.length === props.maxMessageCount) {
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
      closePoll(message.id, false)
      const dropIndex = polls.findIndex(poll => poll.id === message.id)
      if (dropIndex > -1) {
        polls.splice(dropIndex, 1)
      }
    }
    setState({...state, comments, polls})
    const messageListDiv = messageListDivRef.current
    if (state.autoScroll && ref.current && messageListDiv) {
      messageListDiv.scrollTo(0, ref.current.offsetTop)
    }
  }, [state, props.maxMessageCount, closePoll])
  const onSubmit = React.useCallback((message: Message): void => {
    wscRef.current?.send(message)
  }, [])

  const onChangeAutoScroll = React.useCallback((autoScroll: boolean): void => {
    modCookies.bool('autoScroll', autoScroll, FAR_ENOUGH)
    setState({
      ...state,
      autoScroll
    })
  }, [state, modCookies])
  const onChangeSendWithCtrlEnter = React.useCallback((sendWithShiftEnter: boolean): void => {
    modCookies.bool('sendWithCtrlEnter', sendWithShiftEnter, FAR_ENOUGH)
    setState({
      ...state,
      sendWithCtrlEnter: sendWithShiftEnter
    })
  }, [state, modCookies])

  React.useEffect((): (() => void) => {
    messageListDivRef.current = document.getElementsByClassName('message-list')[0]

    return (): void => {
      if (wscRef.current) {
        wscRef.current.close()
        wscRef.current = null
      }
    }
  }, [])
  React.useEffect((): void => {
    if (!cookies.str('room') || !cookies.str('password')) {
      goToLoginPage()
    }
  }, [cookies])

  return (
    <div className="App">
      <div className="nav">
        <div style={{ padding: '0px 12px' }}>Room: {cookies.str('room')}</div>
        <Link href="#" onClick={goToLoginPage}>Back to login</Link>
      </div>
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
                onClosePoll={(pollId): void => closePoll(pollId, true)}
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
      {
        cookies.str('room') && cookies.str('password')
          ? <WebSocketClient url={props.url} onOpen={onOpen} onClose={onClose} onMessage={onMessage} />
          : null
      }
    </div>
  )
}
