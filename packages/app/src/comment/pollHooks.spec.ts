import { renderHook } from '@testing-library/react-hooks'
import { AppState } from './types'
import { useOnPoll, useOnClosePoll } from './pollHooks'
import { ReconnectableWebSocket } from '@/wscomp/rws'

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

function createAppState(): AppState {
  return {
    comments: [{
      key: 1,
      comment: 'comment1',
      pinned: true,
    }, {
      key: 2,
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
    autoScroll: true,
    sendWithCtrlEnter: true,
    openSoundPanel: false,
  }
}

test('onPoll send PollMessage', () => {
  const rws = createReconnectableWebSocket()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event: any = {
    preventDefault: jest.fn()
  }

  const { result } = renderHook(() => useOnPoll(rws))
  const onPoll = result.current
  const to = 'to'
  const choice = 1
  onPoll(event, choice, to)

  expect(event.preventDefault).toBeCalled()
  expect(rws?.send).toBeCalledWith({
    type: 'app',
    cmd: 'poll/poll',
    to,
    choice,
  })
})

test('onClosePoll drops a specified poll', () => {
  const stateMock = createAppState()
  const setStateMock = jest.fn()

  const { result } = renderHook(() => useOnClosePoll(stateMock, setStateMock))
  const onClosePoll = result.current
  const pollId = 'id11'
  const refresh = false
  onClosePoll(pollId, refresh)

  expect(stateMock.polls.length).toBe(1)
  expect(stateMock.polls.filter(p => p.id === pollId).length).toBe(0)
  expect(setStateMock).not.toBeCalled()
})

test('onClosePoll drops a specified poll and update state if refresh is true', () => {
  const stateMock = createAppState()
  const setStateMock = jest.fn()

  const { result } = renderHook(() => useOnClosePoll(stateMock, setStateMock))
  const onClosePoll = result.current
  const pollId = 'id11'
  const refresh = true
  onClosePoll(pollId, refresh)

  expect(stateMock.polls.length).toBe(1)
  expect(stateMock.polls.filter(p => p.id === pollId).length).toBe(0)
  expect(setStateMock).toBeCalledWith(stateMock)
})
