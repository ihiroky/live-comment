import React from 'react'
import { Message, createHash, getLogger } from 'common'
import { WebSocketClient, WebSocketControl } from 'wscomp'
import { SendCommentForm } from './SendCommentForm'
import { AppState, isPlaySoundMessage, PlaySoundMessage } from './types'
import { PollControl } from './PollControl'
import { LabeledCheckbox } from './LabeledCheckbox'
import { FormGroup, Link, makeStyles } from '@material-ui/core'
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

const useStyles = makeStyles({
  App: {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#ccffcc',
    padding: 0,
    margin: 0,
  },
  nav: {
    minWidth: 300,
    width: '90%',
    minHeight: 16,
    height: '3vh',
    margin: 'auto',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 6,
  },
  box: {
    display: 'flex',
    height: 'calc(100% - (3vh + 12px))',  /* 3vh + 12px : acutal nav height */
    margin: 0,
    padding: 0,
  },
  main: {
    textAlign: 'center',
    background: 'rgba(32, 32, 32, 0.1)',
    borderRadius: 6,
    padding: 10,
    margin: 10,
    minWidth: 300,
    width: '95%',
    height: 'calc(100% - 40px)', /* 40px: margin + padding */
    '& form': {
      width: '100%',
      margin: 0,
      '& input[type="text"]': {
        border: 'none',
        padding: 6,
        margin: '10px 0px',
        borderRadius: 6,
        width: '85%'
      },
      '& input[type="submit"]': {
        width: '10%',
        maxWidth: '5vw',
        border: 'none',
        padding: '6px 3px',
        marginTop: 10,
        marginBottom: 10,
        marginLeft: 3,
        borderRadius: 6,
      },
      '& $options': {
        width: '90%',
        padding: '0px 4%',
        fontSize: 8,
      }
    },
  },
  sound: {
    overflow: 'hidden',
    resize: 'horizontal',
    width: 250,
    height: '100%',
    '& iframe': {
      overflow: 'auto',
      border: 0,
      margin: 0,
      padding: 0,
      width: '100%',
      height: '100%',
    },
  },
  'message-list': {
    /* 52px: send form height, 42px: option form height */
    height: 'calc(100% - 52px - 42px)',
    wordWrap: 'break-word',
    overflowY: 'auto',
    margin: 'auto',
  },
  message: {
    textAlign: 'left',
    backgroundColor: '#99ffcc',
    borderRadius: 6,
    padding: 10,
    margin: '10px 20px',
  },
  'options': {}
})

const log = getLogger('App')

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
  const soundPanelRef = React.useRef<HTMLIFrameElement>(null)

  const onOpen = useWebSocketOnOpen(wscRef, cookies)
  const onClose = useWebSocketOnClose(wscRef, modCookies)
  const onPoll = useOnPoll(wscRef)
  const onClosePoll = useOnClosePoll(state, setState)
  const onMessage = useWebSocketOnMessage(
    props.maxMessageCount, state, setState, onClosePoll, messageListDivRef, autoScrollRef, soundPanelRef
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
  React.useEffect((): (() => void)=> {
    const messageListener = (e: MessageEvent<PlaySoundMessage>): void => {
      if (e.origin !== window.location.origin) {
        log.warn('[messageListener] Receive a message from unexpected origin:', e.origin)
        return
      }
      if (!isPlaySoundMessage(e.data)) {
        log.warn('[messageListener] Receive an unexpected message:', e.data)
        return
      }
      wscRef.current?.send(e.data)
    }
    window.addEventListener('message', messageListener)
    return (): void => {
      window.removeEventListener('message', messageListener)
    }
  }, [])

  const style = useStyles()

  const room = cookies.str('room')
  const password = cookies.str('password')
  const checkBoxMeta: Array<{ label: string, name: string, key: CheckboxStateName}> = [
    { label: 'Auto scroll', name: 'auto_scroll', key: 'autoScroll' },
    { label: 'Send with Ctrl+Enter', name: 'send_with_ctrl_enter', key: 'sendWithCtrlEnter' },
    { label: 'Open DDR', name: 'open_ddr', key: 'openSoundPanel' },
  ]
  return (
    <div className={style.App}>
      <div className={style.nav}>
        <div style={{ padding: '0px 12px' }}>Room: {cookies.str('room')}</div>
        <Link href="#" onClick={goToLoginPage}>Back to login</Link>
      </div>
      <div className={style.box}>
        <div>
          { room && password ? (
            <>
              <WebSocketClient url={props.url} onOpen={onOpen} onClose={onClose} onMessage={onMessage} />
              { state.openSoundPanel ? (
                <div className={style.sound}>
                  <iframe
                    ref={soundPanelRef}
                    src={`/sound?room=${room}&hash=${createHash(password)}`} // Use cookie??
                    allow="autoplay 'src'"
                  />
                </div>
              ) : null }
            </>) : null }
        </div>
        <div className={style.main}>
          <div className={style['message-list']} ref={messageListDivRef}>
            {
              state.comments.map(
                (m: AppState['comments'][number]) => <p key={m.key} className={style.message}>{m.comment}</p>
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
            <div className={style.options}>
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
