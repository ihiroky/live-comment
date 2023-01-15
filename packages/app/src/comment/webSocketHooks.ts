import { useCallback, useRef, RefObject } from 'react'
import {
  AcnTokenMessage,
  CloseCode,
  isCommentMessage,
  Message,
} from '@/common/Message'
import { assertNotNullable } from '@/common/assert'
import { getLogger } from '@/common/Logger'

import { gotoLoginPage } from './utils/pages'
import { AppState } from './types'
import { isPlaySoundMessage } from '@/sound/types'
import { isPollFinishMessage, isPollStartMessage } from '@/poll/types'
import { ReconnectableWebSocket } from '@/wscomp/rws'
import { NavigateFunction } from 'react-router-dom'

const log = getLogger('webSocketHooks')

export function useWebSocketOnOpen(rws: ReconnectableWebSocket | null, cb?: () => void): () => void {
  return useCallback((): void => {
    log.debug('[onOpen]', rws)

    const token = window.localStorage.getItem('token')
    if (token) {
      const acn: AcnTokenMessage = {
        type: 'acn',
        token
      }
      rws?.send(acn)
    }

    cb?.()
  }, [rws, cb])
}

export function useWebSocketOnClose(
  rws: ReconnectableWebSocket | null,
  navigate?: NavigateFunction,
  cb?: (ev: CloseEvent) => void
): (e: CloseEvent) => void {
  return useCallback((ev: CloseEvent): void => {
    switch (ev.code) {
      case CloseCode.ACN_FAILED:
        window.localStorage.removeItem('token')
        window.localStorage.setItem(
          'App.notification',
          JSON.stringify({ message: 'Streaming authentication failed.' })
        )
        gotoLoginPage(navigate)
        break
      default:
        rws?.reconnectWithBackoff()
        break
    }

    cb?.(ev)
  }, [rws, navigate, cb])
}

export function useWebSocketOnMessage(
  maxMessageCount: number,
  state: AppState,
  setState: (state: AppState) => void,
  closePoll: (pollId: string, refresh: boolean) => void,
  refs: {
    messageListDivRef: RefObject<HTMLDivElement>
    autoScrollRef: RefObject<HTMLDivElement>
    soundPanelRef: RefObject<HTMLIFrameElement>
  },
  cb?: (m: Message) => void
): (message: Message) => void {
  const { messageListDivRef, autoScrollRef, soundPanelRef } = refs
  const counterRef = useRef<number>(0)
  return useCallback((message: Message): void => {
    log.debug('[onMessage]', message)

    const polls = state.polls
    const comments = state.comments
    let updateState = true
    if (isCommentMessage(message)) {
      const comment = message.comment
      const ts = message.ts ?? 0
      const pinned = !!message.pinned
      if (comments.length === maxMessageCount) {
        comments.shift()
      }
      const key = counterRef.current++
      comments.push({ key, comment, pinned, ts })
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
      updateState = false
    } else {
      log.debug('[onMessage] Unexpected message:', message)
      updateState = false
    }

    if (updateState) {
      setState({...state, comments, polls})
      // Wait for last message is renderered
      window.setTimeout((): void => {
        if (state.autoScroll && autoScrollRef.current && messageListDivRef.current) {
          messageListDivRef.current.scrollTo(0, autoScrollRef.current.offsetTop)
        }
      }, 100)
    }

    cb?.(message)
  }, [state, maxMessageCount, closePoll, autoScrollRef, messageListDivRef, setState, soundPanelRef, cb])
}
