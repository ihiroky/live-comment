import { useCallback, useRef, MutableRefObject, RefObject, ComponentProps } from 'react'
import {
  AcnTokenMessage,
  CloseCode,
  isCommentMessage,
  Message,
} from '@/common/Message'
import { assertNotNullable } from '@/common/assert'
import { getLogger } from '@/common/Logger'

import { goToLoginPage } from './utils/pages'
import { AppState } from './types'
import { isPlaySoundMessage } from './types'
import { isPollFinishMessage, isPollStartMessage } from '@/poll/types'
import { ReconnectableWebSocket } from '@/wscomp/rws'

const log = getLogger('webSocketHooks')

export function useWebSocketOnOpen(rws: ReconnectableWebSocket | null): () => void {
  return useCallback((): void => {
    log.debug('[onOpen]', rws)

    const token = window.localStorage.getItem('token')
    if (!token) {
      return
    }
    const acn: AcnTokenMessage = {
      type: 'acn',
      token
    }
    rws?.send(acn)
  }, [rws])
}


export function useWebSocketOnClose(rws: ReconnectableWebSocket | null): (e: CloseEvent) => void {
  return useCallback((ev: CloseEvent): void => {
    switch (ev.code) {
      case CloseCode.ACN_FAILED:
        window.localStorage.removeItem('token')
        window.localStorage.setItem('App.notification', JSON.stringify({ message: 'Streaming authentication failed.' }))
        goToLoginPage()
        break
      default:
        rws?.reconnectWithBackoff()
        break
    }
  }, [rws])
}

export function useWebSocketOnMessage(
  maxMessageCount: number,
  state: AppState,
  setState: (state: AppState) => void,
  closePoll: (pollId: string, refresh: boolean) => void,
  messageListDivRef: RefObject<HTMLDivElement>,
  autoScrollRef: RefObject<HTMLDivElement>,
  soundPanelRef: RefObject<HTMLIFrameElement>
): (message: Message) => void {
  const counterRef = useRef<number>(0)
  return useCallback((message: Message): void => {
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
