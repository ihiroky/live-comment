import { FC, useState, useCallback, useEffect, useRef } from 'react'
import { Message } from '@/common/Message'
import { getLogger } from '@/common/Logger'
import { useReconnectableWebSocket } from '@/wscomp/rws'
import { SendCommentForm } from './SendCommentForm'
import { AppState as CommentState } from './types'
import { isPlaySoundMessage, PlaySoundMessage } from '@/sound/types'
import { PollControl } from './PollControl'
import { LabeledCheckbox } from './LabeledCheckbox'
import { FormGroup, Link } from '@mui/material'
import makeStyles from '@mui/styles/makeStyles'
import { useWebSocketOnOpen, useWebSocketOnClose, useWebSocketOnMessage } from './webSocketHooks'
import { useOnPoll, useOnClosePoll } from './pollHooks'
import { useToken } from './utils/token'
import { getSoundPageUrl, gotoLoginPage } from './utils/pages'
import { NavigateFunction } from 'react-router-dom'

type CommentProps = {
  url: string
  maxMessageCount: number
  navigate?: NavigateFunction
  onOpen?: () => void
  onClose?: (e: CloseEvent) => void
  onError?: (e: Event) => void
  onMessage?: (m: Message) => void
}

// TODO User should be able to restart poll if the poll entry is closed by mistake.

const useStyles = makeStyles({
  App: {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#ccffcc',
    padding: '0px 4px',
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
    width: '95%',
    height: 'calc(100% - 40px)', /* 40px: margin + padding */
    display: 'flex',
    flexDirection: 'column',
    '& form': {
      display: 'flex',
      margin: 0,
      '& input[type="text"]': {
        flexGrow: 1,
        border: 'none',
        padding: 6,
        margin: '10px 0px',
        borderRadius: 6,
        width: '100%',
      },
      '& input[type="submit"]': {
        border: 'none',
        padding: '6px 3px',
        marginTop: 'auto',
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
  openSound: {
    overflow: 'hidden',
    resize: 'horizontal',
    width: 200,
    height: '100%',
    '& iframe': {
      overflow: 'auto',
      border: 0,
      margin: 0,
      padding: 0,
      width: '100%',
      height: '100%',
      resize: 'horizontal',
    },
  },
  closeSound: {
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    '& iframe': {
      border: 0,
      margin: 0,
      padding: 0,
      width: 0,
      height: 0,
    },
  },
  'message-list': {
    flexGrow: 1,
  },
  message: {
    textAlign: 'left',
    backgroundColor: '#99ffcc',
    borderRadius: 6,
    padding: 10,
    margin: '10px 0px',
  },
  messageContent: {
    marginLeft: 0,
    marginRight: 0,
    overflowWrap: 'anywhere',
    hyphens: 'auto',
  },
  messageTime: {
    textAlign: 'right',
    fontWeight: 'lighter',
    fontSize: 'small',

  },
  'options': {}
})

const log = getLogger('App')

type OptionKey = 'autoScroll' | 'sendWithCtrlEnter' | 'openSoundPanel'

function getBooleanOptionValue(key: OptionKey, defalutValue: boolean): boolean {
  try {
    const s = window.localStorage.getItem(key)
    return s !== null ? !!s : defalutValue
  } catch (e: unknown) {
    // Throws DOMException on accessing window.localStorage in data schema
    return false
  }
}

function setBooleanOptionValue(key: OptionKey, value: boolean): void {
  window.localStorage.setItem(key, value ? 't' : '')
}

function isMobiles(): boolean {
  return /iPhone|iPad|Android/.test(navigator.userAgent)
}

const autoScroll = getBooleanOptionValue('autoScroll', true)
const sendWithCtrlEnter = getBooleanOptionValue('sendWithCtrlEnter', !isMobiles())
const openSoundPanel = getBooleanOptionValue('openSoundPanel', window.innerWidth >= 500)

const checkBoxMeta: Array<{ label: string, name: string, key: OptionKey}> = [
  { label: 'Auto scroll', name: 'auto_scroll', key: 'autoScroll' },
  { label: 'Send with Ctrl+Enter', name: 'send_with_ctrl_enter', key: 'sendWithCtrlEnter' },
  { label: 'DDD', name: 'open_ddd', key: 'openSoundPanel' },
]
isMobiles() && checkBoxMeta.splice(1, 1)
export const Comment: FC<CommentProps> = (props: CommentProps): JSX.Element => {
  // TODO Divide state
  const token = useToken()
  const [state, setState] = useState<CommentState>({
    comments: [],
    polls: [],
    autoScroll: (autoScroll === undefined) || autoScroll,
    sendWithCtrlEnter: (sendWithCtrlEnter === undefined) || sendWithCtrlEnter,
    openSoundPanel: !!openSoundPanel,
  })
  const autoScrollRef = useRef<HTMLDivElement>(null)
  const messageListDivRef = useRef<HTMLDivElement>(null)
  const soundPanelRef = useRef<HTMLIFrameElement>(null)
  const rws = useReconnectableWebSocket(props.url, false)

  const {maxMessageCount, onOpen, onClose, onError, onMessage } = props
  const onWsOpen = useWebSocketOnOpen(rws, onOpen)
  const onWsClose = useWebSocketOnClose(rws, props.navigate, onClose)
  const onPoll = useOnPoll(rws)
  const onClosePoll = useOnClosePoll(state, setState)
  const refs = { messageListDivRef, autoScrollRef, soundPanelRef }
  const onWsMessage = useWebSocketOnMessage(maxMessageCount, state, setState, onClosePoll, refs, onMessage)
  const onWsError = useCallback((e: Event): void => {
    log.error('[onError]', e)
    onError?.(e)
  }, [onError])
  const onSubmit = useCallback((message: Message): void => {
    rws?.send(message)
  }, [rws])
  const onCheckChangeBox = useCallback((name: OptionKey, value: boolean): void => {
    setBooleanOptionValue(name, value)
    setState({
      ...state,
      [name]: value
    })
  }, [state])
  const backToLogin = useCallback((): void => {
    window.localStorage.removeItem('token')
    gotoLoginPage(props.navigate)
  }, [props.navigate])

  useEffect((): (() => void) => {
    const token = window.localStorage.getItem('token')
    if (!token) {
      gotoLoginPage(props.navigate)
    }

    if (rws) {
      rws.addEventListener('open', onWsOpen)
      rws.addEventListener('close', onWsClose)
      rws.addEventListener('error', onWsError)
      rws.addEventListener('message', onWsMessage)
    }
    return (): void => {
      if (rws) {
        rws.removeEventListener('message', onWsMessage)
        rws.removeEventListener('error', onWsError)
        rws.removeEventListener('close', onWsClose)
        rws.removeEventListener('open', onWsOpen)
      }
    }
  }, [props.navigate, onWsClose, onWsError, onWsMessage, onWsOpen, rws])
  useEffect((): (() => void)=> {
    const messageListener = (e: MessageEvent<PlaySoundMessage>): void => {
      if (e.origin !== window.location.origin) {
        log.warn('[messageListener] Receive a message from unexpected origin:', e.origin)
        return
      }
      if (!isPlaySoundMessage(e.data)) {
        log.warn('[messageListener] Receive an unexpected message:', e.data)
        return
      }
      rws?.send(e.data)
    }
    window.addEventListener('message', messageListener)
    return (): void => {
      window.removeEventListener('message', messageListener)
    }
  }, [rws])

  const style = useStyles()

  return (
    <div className={style.App}>
      <div className={style.nav}>
        <div style={{ padding: '0px 12px' }}>Room: {token.payload.room}</div>
        <Link href="#" onClick={backToLogin}>Back to login</Link>
      </div>
      <div className={style.box}>
        <div>
          { token.value ? (
            <>
              <div className={ state.openSoundPanel ? style.openSound : style.closeSound }>
                <iframe ref={soundPanelRef} src={getSoundPageUrl(props.navigate)} allow="autoplay 'src'" />
              </div>
            </>) : null
          }
        </div>
        <div className={style.main}>
          <div className={style['message-list']} ref={messageListDivRef}>
            {
              state.comments.map((m: CommentState['comments'][number]) => (
                <div key={m.key} className={style.message}>
                  <div className={style.messageContent}>{m.comment}</div>
                  <div className={style.messageTime}>{new Date(m.ts).toLocaleString()}</div>
                </div>
              ))
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
