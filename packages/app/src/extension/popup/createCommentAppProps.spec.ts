import { createCommentAppProps } from './createCommentAppProps'
import { jest, test, expect, beforeEach } from '@jest/globals'
import { CommentMessage } from '@/common/Message'

beforeEach(() => {
  global.chrome = {
    runtime: {
      onConnect: {
        addListener: jest.fn<typeof chrome.runtime.onConnect.addListener>(),
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
})

test('Mount and unmount evnets', () => {
  global.chrome = {
    ...global.chrome,
    runtime: {
      ...global.chrome.runtime,
      sendMessage: jest.fn<typeof chrome.runtime.sendMessage>(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  const props = createCommentAppProps()

  props.onMount()
  expect(chrome.runtime.sendMessage).toBeCalledWith({
    type: 'log-window-event',
    status: 'open',
  })

  props.onUnmount()
  expect(chrome.runtime.sendMessage).toBeCalledWith({
    type: 'log-window-event',
    status: 'close',
  })
})

test('Each comment events', () => {
  const props = createCommentAppProps()

  const port: chrome.runtime.Port = {
    postMessage: jest.fn<chrome.runtime.Port['postMessage']>(),
    disconnect: jest.fn<chrome.runtime.Port['disconnect']>(),
    onDisconnect: {
      addListener: jest.fn<chrome.runtime.Port['onDisconnect']['addListener']>(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    onMessage: {} as chrome.runtime.PortMessageEvent,
    name: 'mock',
  }
  const onConnect = jest.mocked(chrome.runtime.onConnect.addListener).mock.calls[0][0]
  onConnect(port)

  props.onOpen?.()
  expect(port.postMessage).toBeCalledWith({
    type: 'comment-open',
  })

  const closeEvent = { code: 1 } as CloseEvent
  props.onClose?.(closeEvent)
  expect(port.postMessage).toBeCalledWith({
    type: 'comment-close',
    event: closeEvent,
  })

  const message: CommentMessage = {
    type: 'comment',
    comment: 'value'
  }
  props.onMessage?.(message)
  expect(port.postMessage).toBeCalledWith({
    type: 'comment-message',
    message,
  })

  const errorEvent = { type: 'error' } as Event
  props.onError?.(errorEvent)
  expect(port.postMessage).toBeCalledWith({
    type: 'comment-error',
    event: errorEvent,
  })
})