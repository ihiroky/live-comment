import { gotoCommentPage, gotoLoginPage, getSoundPageUrl } from './pages'
import { jest, test, expect } from '@jest/globals'
import { NavigateOptions, To } from 'react-router-dom'

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