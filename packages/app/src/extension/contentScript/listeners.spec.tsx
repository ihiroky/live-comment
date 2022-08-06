import { CommentEvent, TargetTab } from '../types'
import { createTargetTabStatusListener } from './listeners'
import { jest, test, beforeEach } from '@jest/globals'
import '@testing-library/jest-dom'

jest.mock('@/comment/App', () => ({
  App: jest.fn(),
}))

beforeEach(() => {
  global.chrome = {
    runtime: {
      connect: jest.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
})

function createPortMock(): chrome.runtime.Port {
  return {
    name: 'mock-port',
    postMessage: jest.fn<chrome.runtime.Port['postMessage']>(),
    onMessage: {
      addListener: jest.fn<chrome.runtime.Port['onMessage']['addListener']>(),
      removeListener: jest.fn<chrome.runtime.Port['onMessage']['removeListener']>(),
    },
    disconnect: jest.fn<chrome.runtime.Port['disconnect']>(),
    onDisconnect: {
      addListener: jest.fn<chrome.runtime.Port['onDisconnect']['addListener']>(),
      removeListener: jest.fn<chrome.runtime.Port['onDisconnect']['addListener']>(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

test('Create and release context', () => {
  const addedMessage: TargetTab = {
    type: 'target-tab',
    status: 'added',
    tabId: 1
  }
  const portMock = createPortMock()
  jest.mocked(chrome.runtime.connect).mockReturnValue(portMock)

  const listener = createTargetTabStatusListener()
  listener(addedMessage)

  const root = document.getElementById('_lc_root')
  expect(root).toBeInTheDocument()

  const removedMessage: TargetTab = {
    type: 'target-tab',
    status: 'removed',
    tabId: 1,
  }
  listener(removedMessage)

  expect(portMock.disconnect).toBeCalled()
  expect(root).not.toBeInTheDocument()
})

test('Message listener', () => {

  const addedMessage: TargetTab = {
    type: 'target-tab',
    status: 'added',
    tabId: 1
  }
  const portMock = createPortMock()
  jest.mocked(chrome.runtime.connect).mockReturnValue(portMock)

  const listener = createTargetTabStatusListener()
  listener(addedMessage)

  const messageListener = jest.mocked(portMock.onMessage.addListener).mock.calls[0][0]
  const commentEvent: CommentEvent = {
    type: 'comment-message',
    message: {
      type: 'comment',
    }
  }
  messageListener(commentEvent, portMock)
  const openEvent: CommentEvent = {
    type: 'comment-open',
  }
  messageListener(openEvent, portMock)
})

test('Change listener settings as visibility changes', () => {
  const addedMessage: TargetTab = {
    type: 'target-tab',
    status: 'added',
    tabId: 1
  }
  const portMock = createPortMock()
  jest.mocked(chrome.runtime.connect).mockReturnValue(portMock)

  const listener = createTargetTabStatusListener()
  listener(addedMessage)

  jest.spyOn(Document.prototype, 'visibilityState', 'get').mockReturnValue('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
  expect(portMock.onMessage.removeListener).toBeCalledWith(expect.any(Function))

  jest.spyOn(Document.prototype, 'visibilityState', 'get').mockReturnValue('visible')
  document.dispatchEvent(new Event('visibilitychange'))
  expect(portMock.onMessage.addListener).toBeCalledWith(expect.any(Function))
})