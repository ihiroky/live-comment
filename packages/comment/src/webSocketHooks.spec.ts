import { renderHook } from '@testing-library/react-hooks'
import '@testing-library/jest-dom'
import { useWebSocketOnOpen, useWebSocketOnClose, useWebSocketOnMessage } from './webSocketHooks'
import { useAppCookies } from './useAppCookies'
import {  ApplicationMessage, CloseCode, CommentMessage, createHash } from 'common'
import { WebSocketControl } from 'wscomp'
import React from 'react'
import { goToLoginPage } from './utils'
import { AppState } from './types'
import { PollFinishMessage, PollStartMessage } from 'poll'

jest.mock('./utils')

function createWebSocketControlMock(): WebSocketControl {
  return {
    _reconnectTimer: 0,
    send: jest.fn(),
    reconnect: jest.fn(),
    reconnectWithBackoff: jest.fn(),
    close: jest.fn()
  }
}

function createAppState(autoScroll: boolean): AppState {
  return {
    comments: [{
      key: 10,
      comment: 'comment1',
      pinned: true,
    }, {
      key: 20,
      comment: 'comment2',
      pinned: false,
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

beforeEach(() => {
  window.localStorage.clear()
})

test('onOpen does nothing if no room cookies', () => {
  const wscRefMock: React.MutableRefObject<WebSocketControl | null> = {
    current: null
  }
  const wsc = createWebSocketControlMock()

  const cookies: ReturnType<typeof useAppCookies>[0] = {
    str: jest.fn().mockImplementation((a: string) => a === 'room' ? undefined : 'hoge'),
    bool: jest.fn(),
  }
  const { result } = renderHook(() => useWebSocketOnOpen(wscRefMock, cookies))
  const onOpen = result.current
  onOpen(wsc)

  expect(wscRefMock.current).toBeNull()
  expect(cookies.str).toHaveBeenCalledWith('room')
  expect(cookies.str).toHaveBeenCalledWith('password')
})

test('onOpen does nothing if no password cookies', () => {
  const wscRefMock: React.MutableRefObject<WebSocketControl | null> = {
    current: null
  }
  const wsc = createWebSocketControlMock()

  const cookies: ReturnType<typeof useAppCookies>[0] = {
    str: jest.fn().mockImplementation((a: string) => a === 'password' ? undefined : 'hoge'),
    bool: jest.fn(),
  }
  const { result } = renderHook(() => useWebSocketOnOpen(wscRefMock, cookies))
  const onOpen = result.current
  onOpen(wsc)

  expect(wscRefMock.current).toBeNull()
  expect(cookies.str).toHaveBeenCalledWith('room')
  expect(cookies.str).toHaveBeenCalledWith('password')
})

test('onOpen sets wscRef and send an acn message', () => {
  const wscRefMock: React.MutableRefObject<WebSocketControl | null> = {
    current: null
  }
  const wsc = createWebSocketControlMock()

  const cookies: ReturnType<typeof useAppCookies>[0] = {
    str: jest.fn().mockImplementation(() => 'hoge'),
    bool: jest.fn(),
  }
  const { result } = renderHook(() => useWebSocketOnOpen(wscRefMock, cookies))
  const onOpen = result.current
  onOpen(wsc)

  expect(cookies.str).toHaveBeenCalledWith('room')
  expect(cookies.str).toHaveBeenCalledWith('password')
  expect(wscRefMock.current?.send).toBeCalledWith({
    type: 'acn',
    room: 'hoge',
    hash: createHash('hoge'),
  })
})

test('onClose with ACN_FAILED goes to login page', () => {
  const wscRefMock: React.MutableRefObject<WebSocketControl | null> = {
    current: createWebSocketControlMock()
  }
  const modCookieMock: ReturnType<typeof useAppCookies>[1] = {
    str: jest.fn(),
    bool: jest.fn(),
    remove: jest.fn(),
  }

  const { result } = renderHook(() => useWebSocketOnClose(wscRefMock, modCookieMock))
  const onClose = result.current
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ev: any = {
    code: CloseCode.ACN_FAILED

  }
  onClose(ev)

  expect(modCookieMock.remove).toHaveBeenCalledWith('room')
  expect(modCookieMock.remove).toHaveBeenCalledWith('password')
  expect(window.localStorage.getItem('App.notification')).toBe(JSON.stringify({ message: 'Authentication failed.' }))
  expect(goToLoginPage).toBeCalled()
})

test('onClose with no ACN_FAILED tries to reconnect', () => {
  const wscRefMock: React.MutableRefObject<WebSocketControl | null> = {
    current: createWebSocketControlMock()
  }
  const modCookieMock: ReturnType<typeof useAppCookies>[1] = {
    str: jest.fn(),
    bool: jest.fn(),
    remove: jest.fn(),
  }

  const { result } = renderHook(() => useWebSocketOnClose(wscRefMock, modCookieMock))
  const onClose = result.current
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ev: any = {
    code: 1001

  }
  onClose(ev)

  expect(wscRefMock.current?.reconnectWithBackoff).toBeCalled()
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

  const { result } = renderHook(() => {
    return useWebSocketOnMessage(10, state, setState, onClosePoll, messageListDivRef, autoScrollRef)
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

  const { result } = renderHook(() => {
    return useWebSocketOnMessage(10, state, setState, onClosePoll, messageListDivRef, autoScrollRef)
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
        pinned: false
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

  const { result } = renderHook(() => {
    const maxMessageCount = state.comments.length
    return useWebSocketOnMessage(maxMessageCount, state, setState, onClosePoll, messageListDivRef, autoScrollRef)
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
        pinned: false
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

  const { result } = renderHook(() => {
    const maxMessageCount = state.comments.length
    return useWebSocketOnMessage(maxMessageCount, state, setState, onClosePoll, messageListDivRef, autoScrollRef)
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

  const { result } = renderHook(() => {
    const maxMessageCount = state.comments.length
    return useWebSocketOnMessage(maxMessageCount, state, setState, onClosePoll, messageListDivRef, autoScrollRef)
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

test('onMessage scrolls to autoScrollRef if autoScroll is true', () => {
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

  const { result } = renderHook(() => {
    return useWebSocketOnMessage(10, state, setState, onClosePoll, messageListDivRef, autoScrollRef)
  })
  const onMessage = result.current
  const comment: CommentMessage = {
    type: 'comment',
    comment: 'comment',
  }
  onMessage(comment)

  expect(messageListDivRef.current?.scrollTo).toBeCalledWith(0, autoScrollRef.current?.offsetTop)
})