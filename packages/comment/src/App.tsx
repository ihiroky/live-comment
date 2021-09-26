import React from 'react'
import './App.css'
import { Message, createHash } from 'common'
import { WebSocketClient, WebSocketControl } from 'wscomp'
import { SendCommentForm } from './SendCommentForm'
import { AppState } from './types'
import { PollControl } from './PollControl'
import { LabeledCheckbox } from './LabeledCheckbox'
import { FormGroup, Link } from '@material-ui/core'
import { useAppCookies, Name as AppCookieName, FAR_ENOUGH } from './useAppCookies'
import { useWebSocketOnOpen, useWebSocketOnClose, useWebSocketOnMessage } from './webSocketHooks'
import { useOnPoll, useOnClosePoll } from './pollHooks'
import { goToLoginPage } from './utils'

type AppProps = {
  url: string
  maxMessageCount: number
}

type CheckboxStateName = 'autoScroll' | 'sendWithCtrlEnter' | 'openSoundPanel'

// TODO User should be able to restart poll if the poll entry is closed by mistake.

export const App: React.FC<AppProps> = (props: AppProps): JSX.Element => {
  const [cookies, modCookies] = useAppCookies()
  // TODO Divide state
  const autoScroll = cookies.bool('autoScroll')
  const sendWithCtrlEnter = cookies.bool('sendWithCtrlEnter')
  const openSoundPanel = cookies.bool('openSoundPanel')
  const [state, setState] = React.useState<AppState>({
    comments: [],
    polls: [],
    autoScroll: (autoScroll === undefined) || autoScroll,
    sendWithCtrlEnter: (sendWithCtrlEnter === undefined) || sendWithCtrlEnter,
    openSoundPanel: !!openSoundPanel,
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
  const onCheckChangeBox = React.useCallback((name: CheckboxStateName, value: boolean): void => {
    modCookies.bool(name as AppCookieName, value, FAR_ENOUGH)
    setState({
      ...state,
      [name]: value
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

  const room = cookies.str('room')
  const password = cookies.str('password')
  const checkBoxMeta: Array<{ label: string, name: string, key: CheckboxStateName}> = [
    { label: 'Auto scroll', name: 'auto_scroll', key: 'autoScroll' },
    { label: 'Send with Ctrl+Enter', name: 'send_with_ctrl_enter', key: 'sendWithCtrlEnter' },
    { label: 'Open DDR', name: 'open_ddr', key: 'openSoundPanel' },
  ]
  return (
    <div className="App">
      <div className="nav">
        <div style={{ padding: '0px 12px' }}>Room: {cookies.str('room')}</div>
        <Link href="#" onClick={goToLoginPage}>Back to login</Link>
      </div>
      <div className="box">
        <div>
          { room && password ? (
            <>
              <WebSocketClient url={props.url} onOpen={onOpen} onClose={onClose} onMessage={onMessage} />
              { state.openSoundPanel ? (
                <div className="sound">
                  <iframe
                    src={`/sound?room=${room}&hash=${createHash(password)}`}
                    allow="autoplay 'src'"
                  />
                </div>
              ) : null }
            </>) : null }
        </div>
        <div className="main">
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
                { checkBoxMeta.map(m => (
                  <LabeledCheckbox
                    key={m.key}
                    label={m.label}
                    name={m.name}
                    checked={state[m.key]}
                    onChange={checked => onCheckChangeBox(m.key, checked)}
                  />
                )) }
              </FormGroup>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
