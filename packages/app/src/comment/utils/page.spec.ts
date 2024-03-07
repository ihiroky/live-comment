import { gotoCommentPage, gotoLoginPage, getSoundPageUrl, login, getToken, setToken, removeToken } from './pages'
import { jest, test, expect } from '@jest/globals'
import { NavigateOptions, To } from 'react-router-dom'
import { fetchWithTimeout } from '@/common/utils'

jest.mock('@/common/utils')

describe('gotoCommentPage', () => {
  test('With navigate', () => {
    const navigate = jest.fn<(to: To | number, options?: NavigateOptions) => void>()

    gotoCommentPage(navigate)

    expect(navigate).toBeCalledWith('/comment')
  })

  test('Without navigate', () => {
    const mockLocation = {
      href: ''
    } as Location
    jest.spyOn(window, 'location', 'get').mockImplementation(() => {
      return mockLocation
    })

    gotoCommentPage()

    expect(mockLocation.href).toBe('./comment')
  })
})

describe('gotoLoginPage', () => {
  test('With navigate', () => {
    const navigate = jest.fn<(to: To | number, options?: NavigateOptions) => void>()

    gotoLoginPage(navigate)

    expect(navigate).toBeCalledWith('/login')
  })

  test('Without navigate', () => {
    const mockLocation = {
      href: ''
    } as Location
    jest.spyOn(window, 'location', 'get').mockImplementation(() => {
      return mockLocation
    })

    gotoLoginPage()

    expect(mockLocation.href).toBe('./login')
  })
})

describe('getSoundPageUrl', () => {
  test('With BrowserRouter', () => {
    const mockLocaiton = {
      origin: 'origin',
      pathname: 'pathname',
      href: 'hoge/comment',
    } as Location
    jest.spyOn(window, 'location', 'get').mockImplementation(() => {
      return mockLocaiton
    })
    const navigate = jest.fn<(to: To | number, options?: NavigateOptions) => void>()

    const actual = getSoundPageUrl(navigate)

    expect(actual).toBe('origin/sound')
  })

  test('With HashRouter', () => {
    const mockLocaiton = {
      origin: 'origin',
      pathname: 'pathname',
      href: 'hoge#/comment',
    } as Location
    jest.spyOn(window, 'location', 'get').mockImplementation(() => {
      return mockLocaiton
    })
    const navigate = jest.fn<(to: To | number, options?: NavigateOptions) => void>()

    const actual = getSoundPageUrl(navigate)

    expect(actual).toBe('origin/pathname#/sound')
  })

  test('Without navigate', () => {
    const actual = getSoundPageUrl()

    expect(actual).toBe('./sound')
  })
})

describe('Send request to login, and then recrive its response', () => {
  test('ok', async () => {
    const jsonMock = jest.fn(() => ({ type: 'acn', token: 'token' }))
    jest.mocked(fetchWithTimeout).mockResolvedValue({
      ok: true,
      json: jsonMock
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    const [apiUrl, room, hash, longLife] = ['apiUrl', 'room', 'hash', true]
    const res = login(apiUrl + '///', room, hash, longLife)

    expect(res).resolves.toEqual({ type: 'acn', token: 'token' })
    expect(fetchWithTimeout).toBeCalledWith(`${apiUrl}/login`, {
      method: 'POST',
      cache: 'no-store',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'acn',
        room,
        longLife,
        hash,
      })
    }, 3000)
  })

  test('Response is not ok', async () => {
    jest.mocked(fetchWithTimeout).mockResolvedValue({
      ok: false,
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    const [apiUrl, room, hash, longLife] = ['apiUrl', 'room', 'hash', true]
    const res = login(apiUrl, room, hash, longLife)

    expect(res).resolves.toEqual({ type: 'error', error: 'ERROR', message: 'Fetch failed' })
  })
})

describe('get/set/remove token', () => {
  test('getToken/setToken', () => {
    const token = 'token'
    setToken(token)
    const actual = getToken()

    expect(actual).toBe(token)
  })

  test('removeToken', () => {
    const token = 'token'
    setToken(token)
    removeToken()
    const actual = getToken()

    expect(actual).toBeNull()
  })
})
