import { App } from './PopupApp'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { store } from '../store'
import { jest, test } from '@jest/globals'

jest.mock('../store', () => {
  const callbacks: (() => void)[] = []
  const obj: typeof store = {
    cache: {
      logTab: { tabId: 0 },
      showCommentTabs: { tabIds: {} },
      aggressive: true
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
      id: 'thisextensionid'
    },
    windows: {
      create: jest.fn<() => Promise<chrome.windows.Window>>().mockResolvedValue({
        id: p.newWindowId,
        tabs: [{
          id: p.newWindowTabId,
        }],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
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
    jest.mocked(store.cache).logTab = { tabId: 0 }
    jest.mocked(store.cache).showCommentTabs = { tabIds: {} }
    jest.mocked(store.cache).aggressive = false

    render(<App store={store} currentTabId={currentTabId} />)

    const feedComments = screen.getByText(/Feed comments/)
    userEvent.click(feedComments)

    await waitFor(() => {
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
    jest.mocked(store.cache).logTab = { tabId: 0 }
    jest.mocked(store.cache).showCommentTabs = { tabIds: {} }
    jest.mocked(store.cache).aggressive = true

    const { rerender } = render(<App store={store} currentTabId={currentTabId} />)

    const feedComments = screen.getByText(/Feed comments/)
    userEvent.click(feedComments)

    await waitFor(() => {
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
      expect(store.update).toBeCalledWith('logTab', { tabId: 0 })
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
    jest.mocked(store.cache).logTab = { tabId: 0 }
    jest.mocked(store.cache).showCommentTabs = { tabIds: {} }
    jest.mocked(store.cache).aggressive = false

    const { rerender } = render(<App store={store} currentTabId={currentTabId} />)

    const feedComments = screen.getByText(/Feed comments/)
    userEvent.click(feedComments)

    // Wait until switch ON
    await waitFor(() => {
      expect(store.cache.logTab).toEqual({ tabId: newWindowTabId })
    })

    rerender(<App store={store} currentTabId={currentTabId} />)
    const inThisTab = screen.getByText(/In this tab/)
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
    jest.mocked(store.cache).logTab = { tabId: 0 }
    jest.mocked(store.cache).showCommentTabs = { tabIds: {} }
    jest.mocked(store.cache).aggressive = true

    const { rerender } = render(<App store={store} currentTabId={currentTabId} />)

    const toggle = screen.getByText(/As soon as a tab opens/)
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