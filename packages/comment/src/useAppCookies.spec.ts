import { useAppCookies } from './useAppCookies'
import { renderHook } from '@testing-library/react-hooks'
import { useCookies } from 'react-cookie'

jest.mock('react-cookie')

let useCookiesMock: jest.Mock

beforeEach(() => {
  useCookiesMock = useCookies as jest.Mock
})

test('Get string value.', () => {
  useCookiesMock.mockImplementation(() => {
    return [{ room: 'roomValue' }]
  })

  const { result } = renderHook(() => useAppCookies())
  const actual = result.current[0].str('room')

  expect(actual).toBe('roomValue')
})

test('Get boolean value.', () => {
  useCookiesMock.mockImplementation(() => {
    return [{ autoScroll: true }]
  })

  const { result } = renderHook(() => useAppCookies())
  const actual = result.current[0].bool('autoScroll')

  expect(actual).toBe(true)
})

test('Set string value.', () => {
  const setterMock = jest.fn()
  useCookiesMock.mockImplementation(() => {
    return [undefined, setterMock]
  })

  const { result } = renderHook(() => useAppCookies())
  result.current[1].str('room', 'roomValue', new Date(0))

  expect(setterMock).toBeCalledWith('room', 'roomValue', {
    secure: true,
    sameSite: 'strict',
    expires: new Date(0)
  })
})

test('Set true.', () => {
  const setterMock = jest.fn()
  useCookiesMock.mockImplementation(() => {
    return [undefined, setterMock]
  })

  const { result } = renderHook(() => useAppCookies())
  result.current[1].bool('autoScroll', true, new Date(1))

  expect(setterMock).toBeCalledWith('autoScroll', 't', {
    secure: true,
    sameSite: 'strict',
    expires: new Date(1)
  })
})

test('Set false.', () => {
  const setterMock = jest.fn()
  useCookiesMock.mockImplementation(() => {
    return [undefined, setterMock]
  })

  const { result } = renderHook(() => useAppCookies())
  result.current[1].bool('autoScroll', false, new Date(1))

  expect(setterMock).toBeCalledWith('autoScroll', '', {
    secure: true,
    sameSite: 'strict',
    expires: new Date(1)
  })
})

test('Remove value.', () => {
  const removeMock = jest.fn()
  useCookiesMock.mockImplementation(() => {
    return [undefined, undefined, removeMock]
  })

  const { result } = renderHook(() => useAppCookies())
  result.current[1].remove('room')

  expect(removeMock).toBeCalledWith('room')
})
