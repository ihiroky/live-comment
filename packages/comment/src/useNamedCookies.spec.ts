import { useNamedCookies } from './useNamedCookies'
import { renderHook } from '@testing-library/react-hooks'
import { useCookies } from 'react-cookie'
import { mocked } from 'ts-jest/utils'

jest.mock('react-cookie')

test('Get string value.', () => {
  mocked(useCookies).mockImplementation(() => {
    return [{ room: 'roomValue' }, () => undefined, () => undefined]
  })

  const { result } = renderHook(() => useNamedCookies(['room'] as const))
  const actual = result.current[0].str('room')

  expect(actual).toBe('roomValue')
})

test('Get boolean value.', () => {
  mocked(useCookies).mockImplementation(() => {
    return [{ autoScroll: true }, () => undefined, () => undefined]
  })

  const { result } = renderHook(() => useNamedCookies(['autoScroll'] as const))
  const actual = result.current[0].str('autoScroll')

  expect(actual).toBe(true)
})

test('Get number value.', () => {
  mocked(useCookies).mockImplementation(() => {
    return [{ width: 0 }, () => undefined, () => undefined]
  })

  const { result } = renderHook(() => useNamedCookies(['width'] as const))
  const actual = result.current[0].num('width')

  expect(actual).toBe(0)
})

test('Get object.', () => {
  mocked(useCookies).mockImplementation(() => {
    return [{ obj: '{"a":"a"}'}, () => undefined, () => undefined]
  })

  const { result } = renderHook(() => useNamedCookies(['obj'] as const))
  const actual = result.current[0].obj('obj')

  expect(actual).toEqual({ a: 'a' })
})

test('Set string value.', () => {
  const setterMock = jest.fn()
  mocked(useCookies).mockImplementation(() => {
    return [undefined, setterMock, () => undefined]
  })

  const { result } = renderHook(() => useNamedCookies(['room'] as const))
  result.current[1].str('room', 'roomValue', new Date(0))

  expect(setterMock).toBeCalledWith('room', 'roomValue', {
    secure: true,
    sameSite: 'strict',
    expires: new Date(0)
  })
})

test('Set true.', () => {
  const setterMock = jest.fn()
  mocked(useCookies).mockImplementation(() => {
    return [undefined, setterMock, () => undefined]
  })

  const { result } = renderHook(() => useNamedCookies(['autoScroll'] as const))
  result.current[1].bool('autoScroll', true, new Date(1))

  expect(setterMock).toBeCalledWith('autoScroll', 't', {
    secure: true,
    sameSite: 'strict',
    expires: new Date(1)
  })
})

test('Set false.', () => {
  const setterMock = jest.fn()
  mocked(useCookies).mockImplementation(() => {
    return [undefined, setterMock, () => undefined]
  })

  const { result } = renderHook(() => useNamedCookies(['autoScroll'] as const))
  result.current[1].bool('autoScroll', false, new Date(1))

  expect(setterMock).toBeCalledWith('autoScroll', '', {
    secure: true,
    sameSite: 'strict',
    expires: new Date(1)
  })
})

test('Set number value.', () => {
  const setterMock = jest.fn()
  mocked(useCookies).mockImplementation(() => {
    return [undefined, setterMock, () => undefined]
  })

  const { result } = renderHook(() => useNamedCookies(['width'] as const))
  result.current[1].num('width', 1, new Date(1))

  expect(setterMock).toBeCalledWith('width', '1', {
    secure: true,
    sameSite: 'strict',
    expires: new Date(1)
  })
})

test('Set object.', () => {
  const setterMock = jest.fn()
  mocked(useCookies).mockImplementation(() => {
    return [undefined, setterMock, () => undefined]
  })

  const { result } = renderHook(() => useNamedCookies(['obj'] as const))
  result.current[1].obj('obj', { a: 'a' })

  expect(setterMock).toBeCalledWith('obj', '{"a":"a"}', {
    secure: true,
    sameSite: 'strict',
  })
})

test('Remove value.', () => {
  const removeMock = jest.fn()
  mocked(useCookies).mockImplementation(() => {
    return [undefined, () => undefined, removeMock]
  })

  const { result } = renderHook(() => useNamedCookies(['room'] as const))
  result.current[1].remove('room')

  expect(removeMock).toBeCalledWith('room')
})
