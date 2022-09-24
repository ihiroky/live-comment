import { CommentEvent, TargetTab } from '../types'
import { createTargetTabStatusListener } from './listeners'
import { jest, test, beforeEach } from '@jest/globals'
import '@testing-library/jest-dom'
import '../store'
import { App } from '@/comment/App'
import { store } from '../store'

jest.mock('../store', () => {
  const callbacks: (() => void)[] = []
  const storeMock = {
    cache: {
      logTab: { tabId: 0 },
      showCommentTabs: { tabIds: {} },
      aggressive: true,
      settingsTab: {
        tabId: 0,
        settings: {
          general: {
            duration: 7,
            fontColor: 'black',
            fontBorderColor: 'white',
          },
        },
      },
    },
    sync: () => Promise.resolve(),
    update: jest.fn((k, v) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (storeMock.cache[k] as any) = v
      callbacks.forEach(c => c())
      return Promise.resolve()
    }),
    subscribe: jest.fn((c: () => void) => {
      callbacks.push(c)
      return (): void => {
        const i = callbacks.indexOf(c)
        if (i > -1) {
          callbacks.splice(i, 1)
        }
      }
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  return {
    store: storeMock
  }
}
)
jest.mock('@/comment/App', () => ({
  App: jest.fn(),
}))
jest.useFakeTimers()

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

test('Ping within 3000 ms from last pong.', () => {
  const addedMessage: TargetTab = {
    type: 'target-tab',
    status: 'added',
    tabId: 1
  }
  const portMock = createPortMock()
  jest.mocked(chrome.runtime.connect).mockReturnValue(portMock)

  const listener = createTargetTabStatusListener()
  listener(addedMessage)

  jest.advanceTimersByTime(1000)

  // Called by timer
  expect(portMock.postMessage).toBeCalledWith({
    type: 'ping',
    id: addedMessage.tabId
  })
  expect(portMock.onMessage.removeListener).not.toBeCalled()
})

test('Ping over 3000 ms from last pong.', () => {
  const addedMessage: TargetTab = {
    type: 'target-tab',
    status: 'added',
    tabId: 1
  }
  const portMock = createPortMock()
  jest.mocked(chrome.runtime.connect).mockReturnValue(portMock)

  const listener = createTargetTabStatusListener()
  listener(addedMessage)

  jest.advanceTimersByTime(4000)

  expect(portMock.postMessage).toBeCalledWith({
    type: 'ping',
    id: addedMessage.tabId
  })
  expect(portMock.onMessage.removeListener).toBeCalled()
})

test('PostMessage to ping throws error, reconnect, reopen failed, then open successfully.', () => {
  const addedMessage: TargetTab = {
    type: 'target-tab',
    status: 'added',
    tabId: 1
  }
  const portMock = createPortMock()
  jest.mocked(portMock.postMessage).mockImplementation((): void => {
    throw new Error('MOCK ERROR')
  })
  jest.mocked(chrome.runtime.connect).mockReturnValue(portMock)

  const listener = createTargetTabStatusListener()
  listener(addedMessage)

  jest.advanceTimersByTime(1000)

  expect(portMock.postMessage).toBeCalledWith({
    type: 'ping',
    id: addedMessage.tabId
  })
  expect(portMock.onMessage.removeListener).toBeCalled()


  // Test reconnect()
  //jest.advanceTimersByTime(1000)
  // Second call by reconnect()
  expect(chrome.runtime.connect).toBeCalledTimes(2)
})

test('Rerender if store is updated', () => {
  const addedMessage: TargetTab = {
    type: 'target-tab',
    status: 'added',
    tabId: 1
  }
  const portMock = createPortMock()
  jest.mocked(chrome.runtime.connect).mockReturnValue(portMock)

  const listener = createTargetTabStatusListener()
  listener(addedMessage)

  store.update('settingsTab', {
    ...store.cache.settingsTab
  })

  // TODO How to test drawing React (App) component.
})
