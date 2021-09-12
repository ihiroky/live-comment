import React from 'react'
import './App.css'
import { Message } from 'common'
import { WebSocketClient, WebSocketControl } from 'wscomp'
import { SendCommentForm } from './SendCommentForm'
import { AppState } from './types'
import { PollControl } from './PollControl'
import { LabeledCheckbox } from './LabeledCheckbox'
import { FormGroup, Link } from '@material-ui/core'
import { useAppCookies, FAR_ENOUGH } from './useAppCookies'
import { useWebSocketOnOpen, useWebSocketOnClose, useWebSocketOnMessage } from './webSocketHooks'
import { useOnPoll, useOnClosePoll } from './pollHooks'
import { goToLoginPage } from './utils'

type AppProps = {
  url: string
  maxMessageCount: number
}

// TODO User should be able to restart poll if the poll entry is closed by mistake.

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
  const autoScrollRef = React.useRef<HTMLDivElement>(null)
  const messageListDivRef = React.useRef<HTMLDivElement>(null)
  const wscRef = React.useRef<WebSocketControl | null>(null)

  const onOpen = useWebSocketOnOpen(wscRef, cookies)
  const onClose = useWebSocketOnClose(wscRef, modCookies)
  const onPoll = useOnPoll(wscRef)
  const onClosePoll = useOnClosePoll(state, setState)
  const onMessage = useWebSocketOnMessage(
    props.maxMessageCount, state, setState, onClosePoll, messageListDivRef, autoScrollRef
  )
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
        <div className="message-list" ref={messageListDivRef}>
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
                onClosePoll={(pollId): void => onClosePoll(pollId, true)}
              />
            )
          }
          <div ref={autoScrollRef}></div>
        </div>
        <SendCommentForm onSubmit={onSubmit} sendWithCtrlEnter={state.sendWithCtrlEnter} />
        <form>
          <div className="options">
            <FormGroup row>
              <LabeledCheckbox
                label="Auto scroll"
                name="scroll_stop"
                checked={state.autoScroll}
                onChange={onChangeAutoScroll}
              />
              <LabeledCheckbox
                label="Send with Ctrl+Enter"
                name="send_with_ctrl_enter"
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
