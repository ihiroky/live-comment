import { createCommentAppProps } from './createCommentAppProps'
import { jest, test, expect, beforeEach } from '@jest/globals'
import { CommentMessage } from '@/common/Message'

beforeEach(() => {
  global.chrome = {
    runtime: {
      onConnect: {
        addListener: jest.fn<typeof chrome.runtime.onConnect.addListener>(),
      },
      sendMessage: jest.fn<typeof chrome.runtime.sendMessage>(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
})

test('Each event', () => {
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
  expect(chrome.runtime.sendMessage).toBeCalledWith({
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