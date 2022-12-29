import { validatePopupWindows } from './validatePopupWindows'
import { store } from '../store'
import { jest, test, expect } from '@jest/globals'

/*

  const logTabId = s.cache.logTab.tabId
  if (logTabId) {
    await chrome.tabs.get(logTabId).catch(() => s.delete('logTab'))
  }
  const settingsTabId = s.cache.settingsTab.tabId
  if (settingsTabId) {
    await chrome.tabs.get(settingsTabId).catch(() => s.delete('settingsTab'))
  }

*/

test('Clear state if valid cache exists', async () => {
  const storeMock = {
    cache: {
      logTab: {
        tabId: 1,
      },
      settingsTab: {
        tabId: 2,
      }
    },
    delete: jest.fn<typeof store.delete>()
  }
  global.chrome = {
    tabs: {
      get: jest.fn<typeof chrome.tabs.get>(() => {
        return Promise.reject()
      }),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await validatePopupWindows(storeMock as any)

  expect(storeMock.delete).toBeCalledWith('logTab')
  expect(storeMock.delete).toBeCalledWith('settingsTab')
})

test('Do nothing if no valid cache exists', async () => {
  const storeMock = {
    cache: {
      logTab: {
        tabId: 0,
      },
      settingsTab: {
        tabId: 0,
      }
    },
    delete: jest.fn<typeof store.delete>()
  }
  global.chrome = {
    tabs: {
      get: jest.fn<typeof chrome.tabs.get>(() => {
        return Promise.reject()
      }),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await validatePopupWindows(storeMock as any)

  expect(storeMock.delete).not.toBeCalledWith('logTab')
  expect(storeMock.delete).not.toBeCalledWith('settingsTab')
})
