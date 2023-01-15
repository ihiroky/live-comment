import { renderHook } from '@testing-library/react-hooks'
import '@testing-library/jest-dom'
import { useWebSocketOnOpen, useWebSocketOnClose, useWebSocketOnMessage } from './webSocketHooks'
import {  ApplicationMessage, CloseCode, CommentMessage } from '@/common/Message'
import { ReconnectableWebSocket } from '@/wscomp/rws'
import * as React from 'react'
import { gotoLoginPage } from './utils/pages'
import { AppState } from './types'
import { PollFinishMessage, PollStartMessage } from '@/poll/types'
import { waitFor } from '@testing-library/react'
import { jest, test, expect } from '@jest/globals'

jest.mock('./utils/pages')

function createReconnectableWebSocket(): ReconnectableWebSocket {
  return {
    send: jest.fn(),
    close: jest.fn(),
    reconnect: jest.fn(),
    reconnectWithBackoff: jest.fn(),
    get readyState(): number {
      return 0
    },
    get url(): string {
      return 'dummy_url'
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }
}

function createAppState(autoScroll: boolean): AppState {
  return {
    comments: [{
      key: 10,
      comment: 'comment1',
      pinned: true,
      ts: 12345,
    }, {
      key: 20,
      comment: 'comment2',
      pinned: false,
      ts: 23456,
    }],
    polls: [{
      key: 11,
      owner: 'owner11',
      id: 'id11',
      title: 'title11',
      entries: [{
        key: 111,
        description: 'desc111'
      }, {
        key: 222,
        description: 'desc222'
      }]
    }, {
      key: 22,
      owner: 'owner22',
      id: 'id22',
      title: 'title22',
      entries: [{
        key: 333,
        description: 'desc333'
      }, {
        key: 444,
        description: 'desc444'
      }]
    }],
    autoScroll,
    sendWithCtrlEnter: true,
    openSoundPanel: false,
  }
}

afterEach(() => {
  window.localStorage.clear()
})

test('onOpen does nothing if no token', () => {
  const rws: ReconnectableWebSocket = createReconnectableWebSocket()

  const { result } = renderHook(() => useWebSocketOnOpen(rws))
  const onOpen = result.current
  onOpen()

  expect(rws.send).not.toBeCalled()
})

test('onOpen sets wscRef and send an acn message', () => {
  const rws: ReconnectableWebSocket = createReconnectableWebSocket()
  const token = 'token'
  window.localStorage.setItem('token', token)

  const { result } = renderHook(() => useWebSocketOnOpen(rws))
  const onOpen = result.current
  onOpen()

  expect(rws.send).toBeCalledWith({
    type: 'acn',
    token,
  })
})

test('onOpen callback', () => {
  const rws: ReconnectableWebSocket = createReconnectableWebSocket()
  const cb = jest.fn()

  const { result } = renderHook(() => useWebSocketOnOpen(rws, cb))
  result.current()

  expect(cb).toBeCalled()
})

test('onClose with ACN_FAILED goes to login page', () => {
  const rws: ReconnectableWebSocket = createReconnectableWebSocket()
  window.localStorage.setItem('token', 'token')

  const { result } = renderHook(() => useWebSocketOnClose(rws))
  const onClose = result.current
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ev: any = {
    code: CloseCode.ACN_FAILED

  }
  onClose(ev)

  expect(window.localStorage.getItem('token')).toBeNull()
  expect(
    window.localStorage.getItem('App.notification')
  ).toBe(
    JSON.stringify({ message: 'Streaming authentication failed.' })
  )
  expect(gotoLoginPage).toBeCalled()
})

test('onClose with no ACN_FAILED tries to reconnect', () => {
  const rws: ReconnectableWebSocket = createReconnectableWebSocket()

  const { result } = renderHook(() => useWebSocketOnClose(rws))
  const onClose = result.current
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ev: any = {
    code: 1001

  }
  onClose(ev)

  expect(rws.reconnectWithBackoff).toBeCalled()
})

test('onClose callback', () => {
  const rws: ReconnectableWebSocket = createReconnectableWebSocket()
  const cb = jest.fn()

  const { result } = renderHook(() => useWebSocketOnClose(rws, undefined, cb))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result.current({ code: 1001 } as any)

  expect(cb).toBeCalledWith({ code: 1001 })
})

test('onMessage ignores non poll application message', () => {
  const state = createAppState(false)
  const setState = jest.fn()
  const onClosePoll = jest.fn()
  const messageListDivRef: React.RefObject<HTMLDivElement> = {
    current: document.createElement('div')
  }
  const autoScrollRef: React.RefObject<HTMLDivElement> = {
    current: document.createElement('div')
  }
  const soundPanelRef: React.RefObject<HTMLIFrameElement> = {
    current: document.createElement('iframe')
  }

  const refs = { messageListDivRef, autoScrollRef, soundPanelRef }
  const { result } = renderHook(() => {
    return useWebSocketOnMessage(10, state, setState, onClosePoll, refs)
  })
  const onMessage = result.current
  const someAppMessage: ApplicationMessage = {
    type: 'app',
    cmd: 'hoge',
  }
  onMessage(someAppMessage)

  expect(setState).not.toBeCalled()
})

test('onMessage which receives comment message add a comment entry', () => {
  const state = createAppState(false)
  const setState = jest.fn()
  const onClosePoll = jest.fn()
  const messageListDivRef: React.RefObject<HTMLDivElement> = {
    current: document.createElement('div')
  }
  const autoScrollRef: React.RefObject<HTMLDivElement> = {
    current: document.createElement('div')
  }
  const soundPanelRef: React.RefObject<HTMLIFrameElement> = {
    current: document.createElement('iframe')
  }

  const refs = { messageListDivRef, autoScrollRef, soundPanelRef }
  const { result } = renderHook(() => {
    return useWebSocketOnMessage(10, state, setState, onClosePoll, refs)
  })
  const onMessage = result.current
  const comment: CommentMessage = {
    type: 'comment',
    comment: 'comment',
  }
  onMessage(comment)

  const initialState = createAppState(false)
  expect(setState).toBeCalledWith({
    ...initialState,
    comments: [
      ...initialState.comments,
      {
        key: 0,
        comment: comment.comment,
        pinned: false,
        ts: 0,
      }
    ]
  })
})

test('onMessage drop old comment if count of comments exceeds maxMessageCount', () => {
  const state = createAppState(false)
  const setState = jest.fn()
  const onClosePoll = jest.fn()
  const messageListDivRef: React.RefObject<HTMLDivElement> = {
    current: document.createElement('div')
  }
  const autoScrollRef: React.RefObject<HTMLDivElement> = {
    current: document.createElement('div')
  }
  const soundPanelRef: React.RefObject<HTMLIFrameElement> = {
    current: document.createElement('iframe')
  }

  const maxMessageCount = state.comments.length
  const refs = { messageListDivRef, autoScrollRef, soundPanelRef }
  const { result } = renderHook(() => {
    return useWebSocketOnMessage(maxMessageCount, state, setState, onClosePoll, refs)
  })
  const onMessage = result.current
  const comment: CommentMessage = {
    type: 'comment',
    comment: 'comment',
  }
  onMessage(comment)

  const initialState = createAppState(false)
  expect(setState).toBeCalledWith({
    ...initialState,
    comments: [
      ...initialState.comments.filter(c => c.key !== 10),
      {
        key: 0,
        comment: comment.comment,
        pinned: false,
        ts: 0
      }
    ]
  })
})

test('onMessage which receives PollStartMessage add a poll entry', () => {
  const state = createAppState(false)
  const setState = jest.fn()
  const onClosePoll = jest.fn()
  const messageListDivRef: React.RefObject<HTMLDivElement> = {
    current: document.createElement('div')
  }
  const autoScrollRef: React.RefObject<HTMLDivElement> = {
    current: document.createElement('div')
  }
  const soundPanelRef: React.RefObject<HTMLIFrameElement> = {
    current: document.createElement('iframe')
  }

  const maxMessageCount = state.comments.length
  const refs = { messageListDivRef, autoScrollRef, soundPanelRef }
  const { result } = renderHook(() => {
    return useWebSocketOnMessage(maxMessageCount, state, setState, onClosePoll, refs)
  })
  const onMessage = result.current
  const message: PollStartMessage = {
    type: 'app',
    cmd: 'poll/start',
    id: 'id1000',
    title: 'title1000',
    entries: [
      { key: 1000, description: 'desc1000' },
      { key: 1001, description: 'desc1001' },
    ],
    from: 'owner'
  }
  onMessage(message)

  const initialState = createAppState(false)
  expect(setState).toBeCalledWith({
    ...initialState,
    polls: [
      ...initialState.polls,
      {
        key: 0,
        owner: message.from,
        id: message.id,
        title: message.title,
        entries: message.entries,
      }
    ]
  })
})

test('onMessage which receives PollFinishMessage removes a poll entry', () => {
  const state = createAppState(false)
  const setState = jest.fn()
  const onClosePoll = jest.fn()
  const messageListDivRef: React.RefObject<HTMLDivElement> = {
    current: document.createElement('div')
  }
  const autoScrollRef: React.RefObject<HTMLDivElement> = {
    current: document.createElement('div')
  }
  const soundPanelRef: React.RefObject<HTMLIFrameElement> = {
    current: document.createElement('iframe')
  }

  const maxMessageCount = state.comments.length
  const refs = { messageListDivRef, autoScrollRef, soundPanelRef }
  const { result } = renderHook(() => {
    return useWebSocketOnMessage(maxMessageCount, state, setState, onClosePoll, refs)
  })
  const onMessage = result.current
  const message: PollFinishMessage = {
    type: 'app',
    cmd: 'poll/finish',
    id: 'id11',
  }
  onMessage(message)

  const initialState = createAppState(false)
  expect(setState).toBeCalledWith({
    ...initialState,
    polls: initialState.polls.filter(p => p.id !== message.id),
  })
})

test('onMessage scrolls to autoScrollRef if autoScroll is true', async () => {
  const state = createAppState(true)
  const setState = jest.fn()
  const onClosePoll = jest.fn()
  const messageListDivRef: React.RefObject<HTMLDivElement> = {
    current: {
      scrollTo: jest.fn()
    } as any  // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  const autoScrollRef: React.RefObject<HTMLDivElement> = {
    current: {
      offsetTop: 123
    } as any  // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  const soundPanelRef: React.RefObject<HTMLIFrameElement> = {
    current: document.createElement('iframe')
  }

  const refs = { messageListDivRef, autoScrollRef, soundPanelRef }
  const { result } = renderHook(() => useWebSocketOnMessage(10, state, setState, onClosePoll, refs))
  const onMessage = result.current
  const comment: CommentMessage = {
    type: 'comment',
    comment: 'comment',
  }
  onMessage(comment)

  await waitFor(() => {
    expect(messageListDivRef.current?.scrollTo).toBeCalledWith(0, autoScrollRef.current?.offsetTop)
  })
})

test('onMessage callback', () => {
  const state = createAppState(true)
  const setState = jest.fn()
  const onClosePoll = jest.fn()
  const messageListDivRef: React.RefObject<HTMLDivElement> = {
    current: {
      scrollTo: jest.fn()
    } as any  // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  const autoScrollRef: React.RefObject<HTMLDivElement> = {
    current: {
      offsetTop: 123
    } as any  // eslint-disable-line @typescript-eslint/no-explicit-any
  }
  const soundPanelRef: React.RefObject<HTMLIFrameElement> = {
    current: document.createElement('iframe')
  }

  const refs = { messageListDivRef, autoScrollRef, soundPanelRef }
  const cb = jest.fn()

  const { result } = renderHook(() => useWebSocketOnMessage(10, state, setState, onClosePoll, refs, cb))
  const comment: CommentMessage = {
    type: 'comment',
    comment: 'comment',
  }
  result.current(comment)

  expect(cb).toBeCalledWith(comment)
})