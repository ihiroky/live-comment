import { createCommentAppProps } from './createCommentAppProps'
import { jest, test, expect, beforeEach } from '@jest/globals'
import { CommentMessage } from '@/common/Message'

beforeEach(() => {
  global.chrome = {
    runtime: {
      onConnect: {
        addListener: jest.fn<typeof chrome.runtime.onConnect.addListener>(),
        removeListener: jest.fn<typeof chrome.runtime.onConnect.removeListener>(),
      },
      sendMessage: jest.fn<typeof chrome.runtime.sendMessage>(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
})

test('Mount and unmount evnets', () => {
  const props = createCommentAppProps()

  props.onMount()
  expect(chrome.runtime.sendMessage).toBeCalledWith({
    type: 'log-window-event',
    status: 'open',
  })
  expect(chrome.runtime.onConnect.addListener).toBeCalled()

  props.onUnmount()
  expect(chrome.runtime.sendMessage).toBeCalledWith({
    type: 'log-window-event',
    status: 'close',
  })
  expect(chrome.runtime.onConnect.removeListener).toBeCalled()
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
    onMessage: {
      addListener: jest.fn<chrome.runtime.Port['onMessage']['addListener']>(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    name: 'mock',
  }

  props.onMount?.()
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

test('onDisconnect of a connected port', () => {
  const props = createCommentAppProps()

  const port: chrome.runtime.Port = {
    postMessage: jest.fn<chrome.runtime.Port['postMessage']>(),
    disconnect: jest.fn<chrome.runtime.Port['disconnect']>(),
    onDisconnect: {
      addListener: jest.fn<chrome.runtime.Port['onDisconnect']['addListener']>(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    onMessage: {
      addListener: jest.fn<chrome.runtime.Port['onMessage']['addListener']>(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    name: 'mock',
  }

  props.onMount?.()
  const onConnect = jest.mocked(chrome.runtime.onConnect.addListener).mock.calls[0][0]
  onConnect(port)

  const onDisconnect = jest.mocked(port.onDisconnect.addListener).mock.calls[0][0]
  onDisconnect(port)

  props.onOpen?.()
  expect(port.postMessage).not.toBeCalled()
})

test('Ping/Pong for content scripts', () => {
  const props = createCommentAppProps()

  const port: chrome.runtime.Port = {
    postMessage: jest.fn<chrome.runtime.Port['postMessage']>(),
    disconnect: jest.fn<chrome.runtime.Port['disconnect']>(),
    onDisconnect: {
      addListener: jest.fn<chrome.runtime.Port['onDisconnect']['addListener']>(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    onMessage: {
      addListener: jest.fn<chrome.runtime.Port['onMessage']['addListener']>(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    name: 'mock',
  }

  props.onMount?.()
  const onConnect = jest.mocked(chrome.runtime.onConnect.addListener).mock.calls[0][0]
  onConnect(port)

  const onMessage = jest.mocked(port.onMessage.addListener).mock.calls[0][0]
  onMessage({ type: 'ping', id: 1 }, port)
  expect(port.postMessage).toBeCalledWith({ type: 'pong', id: 1 })
})