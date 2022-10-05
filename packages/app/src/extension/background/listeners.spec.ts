import { checkTargetTabStatus, cleanUpExtensionTabs } from './listeners'
import { jest, test, expect, beforeEach } from '@jest/globals'
import { store } from '../store'
import { TargetTab } from '../types'

jest.mock('../store', () => ({
  store: {
    cache: {
      logTab: {
        tabId: 1,
      },
      showCommentTabs: {
        tabIds: {},
      },
      aggressive: true,
      settingsTab: {
        tabId: 2,
        settings: {},
      }
    }
  }
}))

beforeEach(() => {
  global.chrome = {
    tabs: {
      sendMessage: jest.fn<typeof chrome.tabs.sendMessage>(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  store.update = jest.fn<typeof store.update>()
})

describe('checkTargetTabStatus', () => {

  test('Returns status added if aggressive mode is ON.', () => {
    const message: TargetTab = {
      type: 'target-tab',
    }
    const tabId = 1
    const sender: chrome.runtime.MessageSender = {
      tab: {
        id: tabId,
      } as chrome.tabs.Tab,
    }
    jest.mocked(store.cache).aggressive = true

    checkTargetTabStatus(message, sender)

    expect(store.update).toBeCalledWith('showCommentTabs', {
      tabIds: {
        [tabId]: true,
      },
    })
    expect(chrome.tabs.sendMessage).toBeCalledWith(tabId, {
      type: 'target-tab',
      status: 'added',
      tabId,
    })
  })

  test('Return no status if aggressive mode is OFF', () => {
    const message: TargetTab = {
      type: 'target-tab',
    }
    const tabId = 1
    const sender: chrome.runtime.MessageSender = {
      tab: {
        id: tabId,
      } as chrome.tabs.Tab,
    }
    jest.mocked(store.cache).aggressive = false

    checkTargetTabStatus(message, sender)

    expect(store.update).not.toBeCalled()
    expect(chrome.tabs.sendMessage).toBeCalledWith(tabId, {
      type: 'target-tab',
      tabId,
    })
  })

  test('Return added status if showCommentsTab contains the tabId', () => {
    const message: TargetTab = {
      type: 'target-tab',
    }
    const tabId = 1
    const sender: chrome.runtime.MessageSender = {
      tab: {
        id: tabId,
      } as chrome.tabs.Tab,
    }
    jest.mocked(store.cache).aggressive = false
    jest.mocked(store.cache).showCommentTabs = {
      tabIds: { 1: true }
    }

    checkTargetTabStatus(message, sender)

    expect(store.update).not.toBeCalled()
    expect(chrome.tabs.sendMessage).toBeCalledWith(tabId, {
      type: 'target-tab',
      status: 'added',
      tabId,
    })
  })

  test('Return no status if logTab.tabId is zero', () => {
    const message: TargetTab = {
      type: 'target-tab'
    }
    const tabId = 1
    const sender: chrome.runtime.MessageSender = {
      tab: {
        id: tabId,
      } as chrome.tabs.Tab
    }
    jest.mocked(store.cache).logTab.tabId = 0

    checkTargetTabStatus(message, sender)

    expect(chrome.tabs.sendMessage).toBeCalledWith(tabId, {
      type: 'target-tab',
      tabId,
    })
  })

  test('Only target-tab is acceptable', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = { hoge: 'fuga' } as any
    const sender: chrome.runtime.MessageSender = {
      tab: {
        id: 1,
      } as chrome.tabs.Tab
    }

    checkTargetTabStatus(message, sender)

    expect(chrome.tabs.sendMessage).not.toBeCalled()
  })

  test('Not acceptable if sender.tab.id is undefined', () => {
    const message: TargetTab = {
      type: 'target-tab'
    }
    const sender: chrome.runtime.MessageSender = {
      tab: {} as chrome.tabs.Tab,
    }

    checkTargetTabStatus(message, sender)

    expect(chrome.tabs.sendMessage).not.toBeCalled()
  })
})

describe('cleanUpExtensonTabs', () => {

  test('Clean up if log tab is open', () => {
    const tabId = store.cache.logTab.tabId
    jest.mocked(store.cache.showCommentTabs).tabIds = {
      10: true,
      20: true,
      30: true,
    }

    cleanUpExtensionTabs(tabId)

    expect(chrome.tabs.sendMessage).toHaveBeenNthCalledWith(1, 10, {
      type: 'target-tab',
      tabId: 10,
      status: 'removed'
    })
    expect(chrome.tabs.sendMessage).toHaveBeenNthCalledWith(2, 20, {
      type: 'target-tab',
      tabId: 20,
      status: 'removed'
    })
    expect(chrome.tabs.sendMessage).toHaveBeenNthCalledWith(3, 30, {
      type: 'target-tab',
      tabId: 30,
      status: 'removed'
    })
    expect(chrome.tabs.sendMessage).toBeCalledTimes(3)
    expect(store.update).toHaveBeenCalledWith('showCommentTabs', { tabIds: {} })
    expect(store.update).toHaveBeenCalledWith('logTab', { tabId: 0 })
    expect(store.update).toBeCalledTimes(2)
  })

  test('Clean up if settings tab is open', () => {
    const tabId = store.cache.settingsTab.tabId

    cleanUpExtensionTabs(tabId)

    expect(store.update).toHaveBeenCalledWith('settingsTab', {
      ...store.cache.settingsTab,
      tabId: 0,
    })
    expect(store.update).toBeCalledTimes(1)
  })

  test('Do nothing if not logTab or settingsTab tab id', () => {
    cleanUpExtensionTabs(10)

    expect(chrome.tabs.sendMessage).not.toBeCalled()
    expect(store.update).not.toBeCalled()
  })
})