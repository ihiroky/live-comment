import { App } from '@/comment/App'
import { fetchWithTimeout, createHash, isObject } from '@/common/utils'
import { jest, describe, test, expect } from '@jest/globals'
import { createRoot, Root } from 'react-dom/client'
import { commentMain } from './renderer'
import { loadDefault, SettingsV1 } from './settings'


jest.mock('@/comment/App', () => ({
  App: jest.fn<typeof App>(),
}))
jest.mock('@/common/utils', () => ({
  fetchWithTimeout: jest.fn<typeof fetchWithTimeout>(),
  createHash: jest.fn<typeof createHash>(p => p),
  isObject: jest.fn<typeof isObject>((m: unknown): m is Record<string, unknown> => true)
}))
const rootMock = {
  render: jest.fn<Root['render']>(),
  unmount: jest.fn<Root['unmount']>(),
}
jest.mock('react-dom/client', () => ({
  createRoot: jest.fn<typeof createRoot>(() => rootMock),
}))

beforeEach(() => {
  window.comment = {
    request: jest.fn<typeof window.comment.request>(),
    send: jest.fn<typeof window.comment.send>(),
  }

  const div = document.createElement('div')
  div.textContent = 'text'
  div.id = 'root'
  document.body.appendChild(div)

  rootMock.render.mockReset()
})

afterEach(() => {
  window.localStorage.clear()
})

describe('commentMain', () => {
  test('Login successfully', async () => {
    jest.mocked(window.comment.request).mockResolvedValue(loadDefault())
    const mockResponse = {
      ok: true,
      json: jest.fn<Response['json']>(() => Promise.resolve({
        type: 'acn',
        attrs: {
          token: 'tokenValue',
        },
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    jest.mocked(fetchWithTimeout).mockResolvedValue(mockResponse)
    await commentMain()

    const component = jest.mocked(rootMock.render).mock.calls[0][0]
    const appProps = (component as React.ReactElement).props.children.props
    expect(appProps).toEqual({
      wsUrl: 'ws://localhost:8080',
      apiUrl: 'http://localhost:9080',
      onOpen: expect.any(Function),
      onClose: expect.any(Function),
      onMessage: expect.any(Function),
      onError: expect.any(Function)
    })
    expect(window.localStorage.getItem('token')).toBe('tokenValue')
    expect(window.comment.send).toBeCalledWith(null)
  })

  test('Login failed', async () => {
    jest.mocked(window.comment.request).mockResolvedValue(loadDefault())
    const mockResponse = {
      ok: true,
      json: jest.fn<Response['json']>(() => Promise.resolve({
        type: 'error',
        error: 'ACN_FAILED',
        message: 'test',
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    jest.mocked(fetchWithTimeout).mockResolvedValue(mockResponse)
    await commentMain()

    const component = jest.mocked(rootMock.render).mock.calls[0][0]
    const appProps = (component as React.ReactElement).props.children.props
    expect(appProps).toEqual({
      wsUrl: 'ws://localhost:8080',
      apiUrl: 'http://localhost:9080',
      onOpen: expect.any(Function),
      onClose: expect.any(Function),
      onMessage: expect.any(Function),
      onError: expect.any(Function)
    })
    expect(window.localStorage.getItem('token')).toBeNull()
    expect(window.comment.send).toBeCalledWith({
      type: 'error',
      error: 'ACN_FAILED',
      message: 'test',
    })
  })

  test('Fetch failed', async () => {
    jest.mocked(window.comment.request).mockResolvedValue(loadDefault())
    const mockResponse = {
      ok: false,
      json: jest.fn<Response['json']>(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    jest.mocked(fetchWithTimeout).mockResolvedValue(mockResponse)
    await commentMain()

    const component = jest.mocked(rootMock.render).mock.calls[0][0]
    const appProps = (component as React.ReactElement).props.children.props
    expect(appProps).toEqual({
      wsUrl: 'ws://localhost:8080',
      apiUrl: 'http://localhost:9080',
      onOpen: expect.any(Function),
      onClose: expect.any(Function),
      onMessage: expect.any(Function),
      onError: expect.any(Function)
    })
    expect(window.localStorage.getItem('token')).toBeNull()
    expect(window.comment.send).toBeCalledWith({
      type: 'error',
      error: 'ERROR',
      message: 'Fetch failed'
    })
  })

  test('Use actual wss url', async () => {
    const { general, watermark } = loadDefault()
    jest.mocked(window.comment.request).mockResolvedValue({
      general: {
        ...general,
        url: 'wss://hogefuga/app'
      },
      watermark: watermark,
    } as SettingsV1)
    const mockResponse = {
      ok: true,
      json: jest.fn<Response['json']>(() => Promise.resolve({
        type: 'acn',
        attrs: {
          token: 'token',
        },
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    jest.mocked(fetchWithTimeout).mockResolvedValue(mockResponse)
    await commentMain()

    const component = jest.mocked(rootMock.render).mock.calls[0][0]
    const appProps = (component as React.ReactElement).props.children.props
    expect(appProps).toEqual({
      wsUrl: 'wss://hogefuga/app',
      apiUrl: 'https://hogefuga/api',
      onOpen: expect.any(Function),
      onClose: expect.any(Function),
      onMessage: expect.any(Function),
      onError: expect.any(Function)
    })
  })

  test('Use host name', async () => {
    const { general, watermark } = loadDefault()
    jest.mocked(window.comment.request).mockResolvedValue({
      general: {
        ...general,
        url: 'hostname'
      },
      watermark: watermark,
    } as SettingsV1)
    const mockResponse = {
      ok: true,
      json: jest.fn<Response['json']>(() => Promise.resolve({
        type: 'acn',
        attrs: {
          token: 'token',
        },
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    jest.mocked(fetchWithTimeout).mockResolvedValue(mockResponse)
    await commentMain()

    const component = jest.mocked(rootMock.render).mock.calls[0][0]
    const appProps = (component as React.ReactElement).props.children.props
    expect(appProps).toEqual({
      wsUrl: 'wss://hostname/app',
      apiUrl: 'https://hostname/api',
      onOpen: expect.any(Function),
      onClose: expect.any(Function),
      onMessage: expect.any(Function),
      onError: expect.any(Function)
    })
  })
})
