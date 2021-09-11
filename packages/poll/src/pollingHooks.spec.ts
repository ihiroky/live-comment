import { renderHook } from '@testing-library/react-hooks'
import { useAcnOk, useOnClick, useOnClose, useOnMessage, useOnOpen, useOnUnmount } from './pollingHooks'
import { AcnMessage, AcnOkMessage, CommentMessage, WebSocketControl } from 'common'
import { PollEntry, PollMessage, PollStartMessage, Progress, Update } from './types'

function createPollEntries(): PollEntry[] {
  return [
    { key: 0, description: 'desc0', count: 0 },
    { key: 1, description: 'desc1', count: 0 },
    { key: 2, description: 'desc2', count: 0 },
  ]
}

function createWebSocketControlMock(): WebSocketControl {
  return {
    _reconnectTimer: 0,
    send: jest.fn(),
    close: jest.fn(),
    reconnect: jest.fn(),
    reconnectWithBackoff: jest.fn(),
  }
}

test('useAcnOk create defered to send PollStartMessage', async () => {
  const props: { pollId: number, title: string, wsc: WebSocketControl | null } = {
    pollId: 0,
    title: 'title',
    wsc: createWebSocketControlMock(),
  }

  const { result, waitFor } = renderHook((p) => useAcnOk(p.pollId, p.title, p.wsc), {
    initialProps: props
  })
  const defered = result.current
  const entries = createPollEntries()
  defered.resolve(entries)

  const expected: PollStartMessage = {
    type: 'app',
    cmd: 'poll/start',
    id: 'poll-' + props.pollId,
    title: props.title,
    entries: entries.map(e => ({ key: e.key, description: e.description })),
  }
  await waitFor(() => {
    expect(props.wsc?.send).toBeCalledWith(expected)
  })
})

function createOnMessageProps(progress: Progress = new Map()): {
  acnOk: { resolve: (entries: PollEntry[]) => void }
  entries: PollEntry[]
  progress: Progress
  onChange: (update: Update) => void
} {
  return {
    acnOk: {
      resolve: jest.fn(),
    },
    entries: createPollEntries(),
    progress,
    onChange: jest.fn(),
  }
}

test('useOnMessage resolves acnOk if message is AcnMessage', () => {
  const props = createOnMessageProps()
  const { result } = renderHook((p) => useOnMessage(p.acnOk, p.entries, p.progress, p.onChange), {
    initialProps: props,
  })
  const onMessage = result.current
  const message: AcnOkMessage = {
    type: 'acn',
    attrs: {},
  }
  onMessage(message)

  expect(props.acnOk.resolve).toBeCalled()
  expect(props.onChange).not.toBeCalled()
})

test('useOnMessage does nothing if message is not AcnMessage or PollMessage', () => {
  const props = createOnMessageProps()
  const { result } = renderHook(p => useOnMessage(p.acnOk, p.entries, p.progress, p.onChange), {
    initialProps: props,
  })

  const onMessage = result.current
  const message: CommentMessage = {
    type: 'comment',
    comment: 'A comment.'
  }
  onMessage(message)

  expect(props.acnOk.resolve).not.toBeCalled()
  expect(props.onChange).not.toBeCalled()
})

test('useOnMessage does nothing if message is not AcnMessage or PollMessage', () => {
  const props = createOnMessageProps()
  const { result } = renderHook(p => useOnMessage(p.acnOk, p.entries, p.progress, p.onChange), {
    initialProps: props,
  })

  const onMessage = result.current
  const message: CommentMessage = {
    type: 'comment',
    comment: 'A comment.'
  }
  onMessage(message)

  expect(props.acnOk.resolve).not.toBeCalled()
  expect(props.onChange).not.toBeCalled()
})

test('useOnMessage does nothing if message.from has the same choice', () => {
  const props = createOnMessageProps(new Map([['from0', 1]]))
  const { result } = renderHook(p => useOnMessage(p.acnOk, p.entries, p.progress, p.onChange), {
    initialProps: props
  })

  const onMessage = result.current
  const message: PollMessage = {
    type: 'app',
    cmd: 'poll/poll',
    from: 'from0',  // the same as progress
    to: 'me',
    choice: 1,  // the same as progress
  }
  onMessage(message)

  expect(props.acnOk.resolve).not.toBeCalled()
  expect(props.onChange).not.toBeCalled()
})

test('useOnMessage create incremental update if a new PollMessage is received', () => {
  const props = createOnMessageProps()
  const { result } = renderHook(p => useOnMessage(p.acnOk, p.entries, p.progress, p.onChange), {
    initialProps: props
  })

  const onMessage = result.current
  const message: PollMessage = {
    type: 'app',
    cmd: 'poll/poll',
    from: 'from0',
    to: 'me',
    choice: 1,
  }
  onMessage(message)

  // Increment choice 1
  expect(props.onChange).toBeCalledWith(new Map([[1, 1]]))
})

test('useOnMessage create incremental and decremental Update if a update PollMessage is received', () => {
  const props = createOnMessageProps(new Map([['from1', 3]]))
  const { result } = renderHook(p => useOnMessage(p.acnOk, p.entries, p.progress, p.onChange), {
    initialProps: props
  })

  const onMessage = result.current
  const message: PollMessage = {
    type: 'app',
    cmd: 'poll/poll',
    from: 'from1',
    to: 'me',
    choice: 2,
  }
  onMessage(message)

  // Increment choice 2 and decrement choice 3
  expect(props.onChange).toBeCalledWith(new Map([[2, 1], [3, -1]]))
})

test('Defferent "from"s do not effect each other', () => {
  const props = createOnMessageProps(new Map([['from1', 3]]))
  const { result } = renderHook(p => useOnMessage(p.acnOk, p.entries, p.progress, p.onChange), {
    initialProps: props
  })

  const onMessage = result.current
  const message: PollMessage = {
    type: 'app',
    cmd: 'poll/poll',
    from: 'from2', // Differenet from progress's keys
    to: 'me',
    choice: 2,
  }
  onMessage(message)

  expect(props.onChange).toBeCalledWith(new Map([[2, 1]]))
})

test('onOpen sends AcnMessage and cache WebSocketControl', () => {
  const props: { wscRef: { current: WebSocketControl | null }, room: string, hash: string } = {
    wscRef: { current: null },
    room: 'room',
    hash: 'hash',
  }
  const { result } = renderHook(p => useOnOpen(p.wscRef, p.room, p.hash), {
    initialProps: props
  })

  const onOpen = result.current
  const wscMock: WebSocketControl = createWebSocketControlMock()
  onOpen(wscMock)

  expect(props.wscRef.current).toEqual(wscMock)
  const expected: AcnMessage = {
    type: 'acn',
    room: props.room,
    hash: props.hash,
  }
  expect(wscMock.send).toBeCalledWith(expected)
})

test('onClose call reconnectWithBackoff()', () => {
  const wsc = createWebSocketControlMock()

  const { result } = renderHook(() => useOnClose(wsc))
  const onClose = result.current
  onClose({ code: 0, reason: '' } as CloseEvent)

  expect(wsc.reconnectWithBackoff).toBeCalled()
})

test('onClick clear progress, send finish message and call onFinished', () => {
  const progress = new Map([['key', 1]])
  const wsc = createWebSocketControlMock()
  const pollId = 1
  const onFinished = jest.fn()

  const { result } = renderHook(() => useOnClick(progress, wsc, pollId, onFinished))
  const onClick = result.current
  onClick()

  expect(progress.size).toBe(0)
  expect(wsc.send).toBeCalledWith({
    type: 'app',
    cmd: 'poll/finish',
    id:  `poll-${pollId}`,
  })
  expect(wsc.close).toBeCalled()
  expect(onFinished).toBeCalled()
})

test('onUnmount clear progress and send finish message', async () => {
  const progresssRef = {
    current: new Map([['key', 1]])
  }
  const wscRef = {
    current: createWebSocketControlMock()
  }
  const pollIdRef = {
    current: 2
  }
  const { unmount, waitFor } = renderHook(p => useOnUnmount(p.progresssRef, p.wscRef, p.pollIdRef), {
    initialProps: {
      progresssRef,
      wscRef,
      pollIdRef,
    }
  })
  unmount()

  await waitFor(() => {
    expect(progresssRef.current.size).toBe(0)
    expect(wscRef.current.send).toBeCalledWith({
      type: 'app',
      cmd: 'poll/finish',
      id:  `poll-${pollIdRef.current}`,
    })
    expect(wscRef.current.close).toBeCalled()
  })
})
