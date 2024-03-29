import { App } from './PopupApp'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { store } from '../store'
import { jest, test, expect } from '@jest/globals'
import { LogWindowEvent } from '../types'

jest.mock('../store', () => {
  const callbacks: (() => void)[] = []
  const obj: typeof store = {
    cache: {
      logTab: { tabId: 0 },
      showCommentTabs: { tabIds: {} },
      aggressive: true,
      settingsTab: {
        tabId: 0,
        settings: {},
      },
    },
    sync: () => Promise.resolve(),
    update: jest.fn<typeof store.update>((k, v) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (obj.cache[k] as any) = v
      callbacks.forEach(c => c())
      return Promise.resolve()
    }),
    subscribe: jest.fn<typeof store.subscribe>((c: () => void) => {
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
    store: obj
  }
})

function mockChromeApi(p: {
  newWindowId: number
  newWindowTabId: number
}) {
  global.chrome = {
    runtime: {
      id: 'thisextensionid',
      onMessage: {
        addListener: jest.fn<typeof chrome.runtime.onMessage.addListener>(),
        removeListener: jest.fn<typeof chrome.runtime.onMessage.removeListener>()
      }
    },
    windows: {
      create: jest.fn<() => Promise<chrome.windows.Window>>().mockResolvedValue({
        id: p.newWindowId,
        tabs: [{
          id: p.newWindowTabId,
        }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
      onRemoved: {
        addListener: jest.fn<typeof chrome.windows.onRemoved.addListener>()
      }
    },
    tabs: {
      sendMessage: jest.fn<typeof chrome.tabs.sendMessage>(),
      get: jest.fn<typeof chrome.tabs.get>().mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tabId) => Promise.resolve({ id: tabId } as any)
      ),
      remove: jest.fn<typeof chrome.tabs.remove>().mockImplementation(
        () => Promise.resolve()
      ),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('On/off', () => {
  test('Switch ON, non agressive mode', async () => {
    const currentTabId = 100
    const newWindowId = 2
    const newWindowTabId = 200
    mockChromeApi({
      newWindowId,
      newWindowTabId
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(jest.mocked(store.cache) as any).logTab = { tabId: 0 }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(jest.mocked(store.cache) as any).showCommentTabs = { tabIds: {} }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(jest.mocked(store.cache) as any).aggressive = false

    render(<App store={store} currentTabId={currentTabId} />)

    const feedComments = screen.getByText(/Feed\/Post comments/)
    userEvent.click(feedComments)

    await waitFor(() => {
      // Emulate receiving LogWindowStatus
      const commentOpenListener = jest.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0]
      const mountedEvent: LogWindowEvent = {
        type: 'log-window-event',
        status: 'open',
      }
      commentOpenListener(mountedEvent, {} as chrome.runtime.MessageSender, () => undefined)

      const width = 800
      const height = 800
      expect(store.cache.logTab).toEqual({ tabId: newWindowTabId })
      expect(store.cache.showCommentTabs).toEqual({ tabIds: {} })
      expect(chrome.windows.create).toBeCalledWith({
        type: 'panel',
        url: 'chrome-extension://' + chrome.runtime.id + '/popup/comment.html',
        top: window.screen.availHeight - height,
        left: window.screen.availWidth - width,
        width,
        height,
      })
      expect(chrome.tabs.sendMessage).not.toBeCalled()
    })
  })

  test('Switch ON with agressive mode, then OFF', async () => {
    const currentTabId = 100
    const newWindowId = 2
    const newWindowTabId = 200
    mockChromeApi({
      newWindowId,
      newWindowTabId
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(jest.mocked(store.cache) as any).logTab = { tabId: 0 }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(jest.mocked(store.cache) as any).showCommentTabs = { tabIds: {} }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(jest.mocked(store.cache) as any).aggressive = true

    const { rerender } = render(<App store={store} currentTabId={currentTabId} />)

    const feedComments = screen.getByText(/Feed\/Post comments/)
    userEvent.click(feedComments)

    await waitFor(() => {
      // Emulate receiving LogWindowStatus
      const commentOpenListener = jest.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0]
      const mountedEvent: LogWindowEvent = {
        type: 'log-window-event',
        status: 'open',
      }
      commentOpenListener(mountedEvent, {} as chrome.runtime.MessageSender, () => undefined)

      const width = 800
      const height = 800
      expect(store.cache.logTab).toEqual({ tabId: newWindowTabId })
      expect(store.cache.showCommentTabs).toEqual({
        tabIds: {
          [currentTabId]: true
        }
      })
      expect(chrome.windows.create).toBeCalledWith({
        type: 'panel',
        url: 'chrome-extension://' + chrome.runtime.id + '/popup/comment.html',
        top: window.screen.availHeight - height,
        left: window.screen.availWidth - width,
        width,
        height,
      })
      expect(chrome.tabs.sendMessage).toBeCalledWith(currentTabId, {
        type: 'target-tab',
        tabId: currentTabId,
        status: 'added'
      })
    })

    rerender(<App store={store} currentTabId={currentTabId} />)
    userEvent.click(feedComments)

    await waitFor(() => {
      expect(chrome.tabs.get).toBeCalledWith(newWindowTabId)
      expect(chrome.tabs.remove).toBeCalledWith(newWindowTabId)
    })
  })
})

describe('In this tab', () => {
  test('On, then off', async () => {
    const currentTabId = 100
    const newWindowId = 2
    const newWindowTabId = 200
    mockChromeApi({
      newWindowId,
      newWindowTabId
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(jest.mocked(store.cache) as any).logTab = { tabId: 0 }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(jest.mocked(store.cache) as any).showCommentTabs = { tabIds: {} }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(jest.mocked(store.cache) as any).aggressive = false

    const { rerender } = render(<App store={store} currentTabId={currentTabId} />)

    const feedComments = screen.getByText(/Feed\/Post comments/)
    userEvent.click(feedComments)

    // Wait until switch ON
    await waitFor(() => {
      // Emulate receiving LogWindowStatus
      const commentOpenListener = jest.mocked(chrome.runtime.onMessage.addListener).mock.calls[0][0]
      const mountedEvent: LogWindowEvent = {
        type: 'log-window-event',
        status: 'open',
      }
      commentOpenListener(mountedEvent, {} as chrome.runtime.MessageSender, () => undefined)

      expect(store.cache.logTab).toEqual({ tabId: newWindowTabId })
    })

    rerender(<App store={store} currentTabId={currentTabId} />)
    const inThisTab = screen.getByText(/Show comments in this tab/)
    userEvent.click(inThisTab)

    await waitFor(() => {
      expect(store.update).toBeCalledWith('showCommentTabs', {
        tabIds: {
          [currentTabId]: true,
        }
      })
      expect(chrome.tabs.sendMessage).toBeCalledWith(currentTabId, {
        type: 'target-tab',
        tabId: currentTabId,
        status: 'added'
      })
    })

    rerender(<App store={store} currentTabId={currentTabId} />)
    userEvent.click(inThisTab)

    await waitFor(() => {
      expect(store.update).toBeCalledWith('showCommentTabs', { tabIds: {} })
      expect(chrome.tabs.sendMessage).toBeCalledWith(currentTabId, {
        type: 'target-tab',
        tabId: currentTabId,
        status: 'removed'
      })
    })
  })
})

describe('Aggressive mode', () => {
  test('On, then off', async () => {
    const currentTabId = 100
    const newWindowId = 2
    const newWindowTabId = 200
    mockChromeApi({
      newWindowId,
      newWindowTabId
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(jest.mocked(store.cache) as any).logTab = { tabId: 0 }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(jest.mocked(store.cache) as any).showCommentTabs = { tabIds: {} }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(jest.mocked(store.cache) as any).aggressive = true

    const { rerender } = render(<App store={store} currentTabId={currentTabId} />)

    const toggle = screen.getByText(/Show comments as soon as a tab opens/)
    userEvent.click(toggle)

    await waitFor(() => {
      expect(store.cache.aggressive).toBe(false)
    })

    rerender(<App store={store} currentTabId={currentTabId} />)
    userEvent.click(toggle)

    await waitFor(() => {
      expect(store.cache.aggressive).toBe(true)
    })
  })
})

describe('Settings', () => {
  test('Open settings window if not open, then close the window', async () => {
    const currentTabId = 1
    const newWindowId = 2
    const newWindowTabId = 200
    mockChromeApi({
      newWindowId,
      newWindowTabId,
    })

    render(<App store={store} currentTabId={currentTabId} />)

    const button = screen.getByRole('button', { name: /Settings/ })
    userEvent.click(button)
    await waitFor(() => {
      expect(store.cache.settingsTab.tabId).toBe(newWindowTabId)
    })
  })

  test('Do nothing if already open', async () => {
    const currentTabId = 1
    const newWindowId = 2
    const newWindowTabId = 200
    mockChromeApi({
      newWindowId,
      newWindowTabId,
    })
    jest.mocked(store.cache).settingsTab.tabId = 1000

    render(<App store={store} currentTabId={currentTabId} />)

    const button = screen.getByRole('button', { name: /Settings/ })
    userEvent.click(button)

    expect(chrome.windows.create).not.toBeCalled()
  })
})
