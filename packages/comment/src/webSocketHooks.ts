import React from 'react'
import { AcnMessage, assertNotNullable, CloseCode, createHash, getLogger, isCommentMessage, Message, WebSocketClient, WebSocketControl } from 'common'
import { useAppCookies } from './useAppCookies'
import { goToLoginPage } from './utils'
import { AppState } from './types'
import { isPollFinishMessage, isPollStartMessage } from 'poll'

const log = getLogger('webSocketHooks')

export function useWebSocketOnOpen(
  wscRef: React.MutableRefObject<WebSocketControl | null>,
  cookies: ReturnType<typeof useAppCookies>[0],
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
  }, [cookies])
}


export function useWebSocketOnClose(
  wscRef: React.MutableRefObject<WebSocketControl | null>,
  modCookies: ReturnType<typeof useAppCookies>[1],
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
  }, [modCookies])
}

export function useWebSocketOnMessage(
  maxMessageCount: number,
  state: AppState,
  setState: (state: AppState) => void,
  closePoll: (pollId: string, refresh: boolean) => void,
  messageListDivRef: React.RefObject<HTMLDivElement>,
  autoScrollRef: React.RefObject<HTMLDivElement>,
): React.ComponentProps<typeof WebSocketClient>['onMessage'] {
  const counterRef = React.useRef<number>(0)
  return React.useCallback((message: Message): void => {
    log.debug('[onMessage]', message)
    if (!isCommentMessage(message)
      && !isPollStartMessage(message)
      && !isPollFinishMessage(message)
    ) {
      log.warn('[onMessage] Unexpected message:', message)
      return
    }

    const key = counterRef.current++
    const polls = state.polls
    const comments = state.comments
    if (isCommentMessage(message)) {
      const comment = message.comment
      const pinned = !!message.pinned
      if (comments.length === maxMessageCount) {
        comments.shift()
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
    if (state.autoScroll && autoScrollRef.current && messageListDivRef.current) {
      messageListDivRef.current.scrollTo(0, autoScrollRef.current.offsetTop)
    }
  }, [state, maxMessageCount, closePoll])
}
