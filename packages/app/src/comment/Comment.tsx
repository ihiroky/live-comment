import { FC, useState, useCallback, useEffect, useRef } from 'react'
import { Message } from '@/common/Message'
import { getLogger } from '@/common/Logger'
import { isMobiles } from '@/common/utils'
import { useReconnectableWebSocket } from '@/wscomp/rws'
import { SendCommentForm } from './SendCommentForm'
import { AppState as CommentState } from './types'
import { isPlaySoundMessage, PlaySoundMessage } from '@/sound/types'
import { PollControl } from './PollControl'
import { LabeledCheckbox } from './LabeledCheckbox'
import { FormGroup, Link, Slide } from '@mui/material'
import { styled } from '@mui/system'
import { useWebSocketOnOpen, useWebSocketOnClose, useWebSocketOnMessage } from './webSocketHooks'
import { useOnPoll, useOnClosePoll } from './pollHooks'
import { useToken } from './utils/token'
import { getSoundPageUrl, getToken, gotoLoginPage, removeToken } from './utils/pages'
import { NavigateFunction } from 'react-router-dom'
import { TransitionGroup } from 'react-transition-group'

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

const AppDiv = styled('div')({
  width: '100vw',
  height: '100vh',
  backgroundColor: '#ccffcc',
  margin: 0,
})

const NavDiv = styled('div')({
  minWidth: 300,
  width: '90%',
  minHeight: 16,
  height: '3vh',
  margin: 'auto',
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  padding: 6,
})

const BoxDiv = styled('div')({
  display: 'flex',
  height: 'calc(100% - (3vh + 12px))',  /* 3vh + 12px : acutal nav height */
  margin: 0,
  padding: 0,
})

const MainDiv = styled('div')({
  textAlign: 'center',
  background: 'rgba(32, 32, 32, 0.1)',
  borderRadius: 6,
  padding: 10,
  margin: 10,
  width: '100%',
  height: 'calc(100% - 40px)', /* 40px: margin + padding */
  display: 'flex',
  flexDirection: 'column',
})

const OptionForm = styled('form')({
  display: 'flex',
  justifyContent: 'flex-end',
  margin: 0,
  paddingRight: 4,
})

const FormOptions = styled('div')({
  fontSize: 8,
})

const OpenSoundDiv = styled('div')({
  overflow: 'hidden',
  resize: 'horizontal',
  width: 200,
  height: '100%',
})

const SoundIFrame = styled('iframe')({
  overflow: 'auto',
  border: 0,
  margin: 0,
  padding: 0,
  width: '100%',
  height: '100%',
  resize: 'horizontal',
})

const CloseSoundDiv = styled('div')({
  top: 0,
  left: 0,
  width: 0,
  height: 0,
})

const NoSoundIFrame = styled('iframe')({
  border: 0,
  margin: 0,
  padding: 0,
  width: 0,
  height: 0,
})

const MessageListDiv = styled('div')({
  flexGrow: 1,
  overflowY: 'auto',
  // コメントのスライドアニメーション時に横スクロールバーが表示されるのを防ぐ
  overflowX: 'hidden',
})

const MessageDiv = styled('div')({
  textAlign: 'left',
  background: 'rgba(226, 255, 238, 0.86)',
  border: '1px solid rgba(48, 155, 106, 0.32)',
  borderLeft: '3px solid #20a86d',
  borderRadius: 6,
  padding: '8px 12px',
  margin: '4px 0px',
})

const MessageContentDiv = styled('div')({
  marginLeft: 0,
  marginRight: 0,
  overflowWrap: 'anywhere',
  hyphens: 'auto',
  color: '#15382c',
  fontWeight: 500,
})

const MessageTimeDiv = styled('div')({
  textAlign: 'right',
  color: '#4f806d',
  fontFamily: '"Century Gothic", "Avenir Next", "Helvetica Neue", sans-serif',
  fontWeight: 400,
  fontSize: 12,
  marginTop: 8,
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

const autoScroll = getBooleanOptionValue('autoScroll', true)
const sendWithCtrlEnter = getBooleanOptionValue('sendWithCtrlEnter', !isMobiles())
const openSoundPanel = getBooleanOptionValue('openSoundPanel', window.innerWidth >= 500)

const checkBoxMeta: Array<{ label: string, hint: string, name: string, key: OptionKey}> = [
  { label: 'Auto scroll', hint: '新しいコメントまで自動で追従します', name: 'auto_scroll', key: 'autoScroll' },
  { label: 'Send with Ctrl+Enter', hint: 'Ctrl+Enterでコメントを送信します', name: 'send_with_ctrl_enter', key: 'sendWithCtrlEnter' },
  { label: 'DDD', hint: '効果音パネルを表示します', name: 'open_ddd', key: 'openSoundPanel' },
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
    // TODO call logout
    removeToken()
    gotoLoginPage(props.navigate)
  }, [props.navigate])

  useEffect((): (() => void) => {
    const token = getToken()
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

  return (
    <AppDiv>
      <NavDiv>
        <div style={{ padding: '0px 12px' }}>Room: {token.payload.room}</div>
        <Link href="#" onClick={backToLogin}>Back to login</Link>
      </NavDiv>
      <BoxDiv>
        <div>
          { token.value ? (
            <>
              { state.openSoundPanel ? (
                <OpenSoundDiv>
                  <SoundIFrame ref={soundPanelRef} src={getSoundPageUrl(props.navigate)} allow="autoplay 'src'"></SoundIFrame>
                </OpenSoundDiv>
              ) : (
                <CloseSoundDiv>
                  <NoSoundIFrame ref={soundPanelRef} src={getSoundPageUrl(props.navigate)} allow="autoplay 'src'"></NoSoundIFrame>
                </CloseSoundDiv>
              )}
            </>) : null
          }
        </div>
        <MainDiv>
          <MessageListDiv ref={messageListDivRef}>
            <TransitionGroup>
              {
                state.comments.map((m: CommentState['comments'][number]) => (
                  <Slide key={m.key} direction="left" mountOnEnter unmountOnExit>
                    <MessageDiv>
                      <MessageContentDiv>{m.comment}</MessageContentDiv>
                      <MessageTimeDiv>{new Date(m.ts).toLocaleString()}</MessageTimeDiv>
                    </MessageDiv>
                  </Slide>
                ))
              }
            </TransitionGroup>
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
          </MessageListDiv>
          <SendCommentForm onSubmit={onSubmit} sendWithCtrlEnter={state.sendWithCtrlEnter} />
          <OptionForm>
            <FormOptions>
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
            </FormOptions>
          </OptionForm>
        </MainDiv>
      </BoxDiv>
    </AppDiv>
  )
}
