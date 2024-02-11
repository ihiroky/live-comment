import { renderHook, waitFor } from '@testing-library/react'
import { useAcnOk, useOnClick, useOnClose, useOnMessage, useOnOpen, useOnUnmount } from './pollingHooks'
import { AcnMessage, AcnOkMessage, CommentMessage } from '@/common/Message'
import { PollEntry, PollMessage, PollStartMessage, Progress, Update } from './types'
import { MutableRefObject } from 'react'
import { ReconnectableWebSocket } from '@/wscomp/rws'
import { jest, test, expect } from '@jest/globals'

function createPollEntries(): PollEntry[] {
  return [
    { key: 0, description: 'desc0', count: 0 },
    { key: 1, description: 'desc1', count: 0 },
    { key: 2, description: 'desc2', count: 0 },
  ]
}

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

test('useAcnOk create defered to send PollStartMessage', async () => {
  const props: {
    pollId: MutableRefObject<number>
    title: string
    rws: ReconnectableWebSocket | null
  } = {
    pollId: { current: 0 },
    title: 'title',
    rws: createReconnectableWebSocket(),
  }

  const { result } = renderHook((p) => useAcnOk(p.pollId, p.title, p.rws), {
    initialProps: props
  })
  const defered = result.current
  const entries = createPollEntries()
  defered.resolve(entries)

  const expected: PollStartMessage = {
    type: 'app',
    cmd: 'poll/start',
    id: 'poll-' + props.pollId.current,
    title: props.title,
    entries: entries.map(e => ({ key: e.key, description: e.description })),
  }
  await waitFor(() => {
    expect(props.rws?.send).toBeCalledWith(expected)
  })
})

function createOnMessageProps(progress: Progress = new Map()): {
  acnOk: { resolve: (entries: PollEntry[]) => void }
  entries: PollEntry[]
  progress: { current: Progress }
  onChange: (update: Update) => void
} {
  return {
    acnOk: {
      resolve: jest.fn(),
    },
    entries: createPollEntries(),
    progress: { current: progress },
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
    attrs: { token: 'token' },
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
  const props: { rws: ReconnectableWebSocket | null, room: string, hash: string } = {
    rws: createReconnectableWebSocket(),
    room: 'room',
    hash: 'hash',
  }
  const { result } = renderHook(p => useOnOpen(p.rws, p.room, p.hash), {
    initialProps: props
  })

  const onOpen = result.current
  onOpen()

  const expected: AcnMessage = {
    type: 'acn',
    room: props.room,
    hash: props.hash,
  }
  expect(props.rws?.send).toBeCalledWith(expected)
})

test('onClose call reconnectWithBackoff()', () => {
  const rws = createReconnectableWebSocket()

  const { result } = renderHook(() => useOnClose(rws))
  const onClose = result.current
  onClose({ code: 0, reason: '' } as CloseEvent)

  expect(rws?.reconnectWithBackoff).toBeCalled()
})

test('onClick clear progress, send finish message and call onFinished', () => {
  const progress = { current: new Map([['key', 1]]) }
  const rws = createReconnectableWebSocket()
  const pollId = { current: 1 }
  const onFinished = jest.fn()

  const { result } = renderHook(() => useOnClick(progress, rws, pollId, onFinished))
  const onClick = result.current
  onClick()

  expect(progress.current.size).toBe(0)
  expect(rws.send).toBeCalledWith({
    type: 'app',
    cmd: 'poll/finish',
    id:  `poll-${pollId.current}`,
  })
  expect(rws.close).toBeCalled()
  expect(onFinished).toBeCalled()
})

test('onUnmount clear progress and send finish message', async () => {
  const progresssRef = {
    current: new Map([['key', 1]])
  }
  const rws = createReconnectableWebSocket()
  const pollIdRef = {
    current: 2
  }
  const { unmount } = renderHook(p => useOnUnmount(p.progresssRef, p.rws, p.pollIdRef), {
    initialProps: {
      progresssRef,
      rws,
      pollIdRef,
    }
  })
  unmount()

  await waitFor(() => {
    expect(progresssRef.current.size).toBe(0)
    expect(rws.send).toBeCalledWith({
      type: 'app',
      cmd: 'poll/finish',
      id:  `poll-${pollIdRef.current}`,
    })
    expect(rws.close).toBeCalled()
  })
})
