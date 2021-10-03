import React from 'react'
import {
  AcnMessage,
  assertNotNullable,
  CloseCode,
  createHash,
  getLogger,
  isCommentMessage,
  Message,
} from 'common'
import { WebSocketClient, WebSocketControl } from 'wscomp'
import { useNamedCookies, CookieAccessor, CookieModifier } from './useNamedCookies'
import { goToLoginPage } from './utils'
import { AppState, isPlaySoundMessage, AppCookieName } from './types'
import { isPollFinishMessage, isPollStartMessage } from 'poll'

const log = getLogger('webSocketHooks')

export function useWebSocketOnOpen(
  wscRef: React.MutableRefObject<WebSocketControl | null>,
  cookies: CookieAccessor<AppCookieName>,
): NonNullable<React.ComponentProps<typeof WebSocketClient>['onOpen']> {
  return React.useCallback((wsc: WebSocketControl): void => {
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
  }, [cookies, wscRef])
}


export function useWebSocketOnClose(
  wscRef: React.MutableRefObject<WebSocketControl | null>,
  modCookies: CookieModifier<AppCookieName>,
): NonNullable<React.ComponentProps<typeof WebSocketClient>['onClose']> {
  return React.useCallback((ev: CloseEvent): void => {
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
  }, [modCookies, wscRef])
}

export function useWebSocketOnMessage(
  maxMessageCount: number,
  state: AppState,
  setState: (state: AppState) => void,
  closePoll: (pollId: string, refresh: boolean) => void,
  messageListDivRef: React.RefObject<HTMLDivElement>,
  autoScrollRef: React.RefObject<HTMLDivElement>,
  soundPanelRef: React.RefObject<HTMLIFrameElement>
): React.ComponentProps<typeof WebSocketClient>['onMessage'] {
  const counterRef = React.useRef<number>(0)
  return React.useCallback((message: Message): void => {
    log.debug('[onMessage]', message)

    const polls = state.polls
    const comments = state.comments
    if (isCommentMessage(message)) {
      const comment = message.comment
      const pinned = !!message.pinned
      if (comments.length === maxMessageCount) {
        comments.shift()
      }
      const key = counterRef.current++
      comments.push({ key, comment, pinned })
    } else if (isPollStartMessage(message)) {
      assertNotNullable(message.from, 'PollStartMessage.from')
      const key = counterRef.current++
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
    } else if (isPlaySoundMessage(message)) {
      if (soundPanelRef.current) {
        const targetWindow = soundPanelRef.current.contentWindow
        if (targetWindow) {
          targetWindow.postMessage(message, window.location.origin)
        } else {
          log.debug('[onMessage] No contentWindow of soundPanel.')
        }
      } else {
        log.info('[onMessage] iframe of soundPanel is not found.')
      }
      return
    } else {
      log.debug('[onMessage] Unexpected message:', message)
      return
    }

    setState({...state, comments, polls})
    if (state.autoScroll && autoScrollRef.current && messageListDivRef.current) {
      messageListDivRef.current.scrollTo(0, autoScrollRef.current.offsetTop)
    }
  }, [state, maxMessageCount, closePoll, autoScrollRef, messageListDivRef, setState, soundPanelRef])
}
