import { jest, describe, expect, test } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fetchWithTimeout } from '@/common/utils'
import { SelectRoom } from './SelectRoom'
import {
  AcnOkMessage,
  AcnRoomsMessage,
  isAcnRoomsMessage,
  isAcnOkMessage,
  ErrorMessage,
  isErrorMessage,
} from '@/common/Message'
import { gotoCommentPage, login, setToken } from './utils/pages'

jest.mock('@/common/utils')
jest.mock('@/common/Message')
jest.mock('./utils/pages')

function prepare() {
  const navigate = jest.fn()
  const apiUrl = 'http://localhost:3000'
  const response: AcnRoomsMessage = {
    type: 'acn',
    nid: 'nid',
    rooms: [
      { room: 'room1', hash: 'hash1' },
      { room: 'room2', hash: 'hash2' },
    ],
  }

  return { navigate, apiUrl, response }
}

async function fetchAndRender(
  apiUrl: string,
  navigate: jest.Mock,
  nid: string,
  rooms: { room: string, hash: string}[],
  targetOrigin = 'origin',
): Promise<{ rerender: typeof rerender, rooms: HTMLElement[]}> {
  // Fetch rooms
  const { rerender } = render(
    <SelectRoom apiUrl={apiUrl} navigate={navigate} allowPostCredentialOrigin={targetOrigin} />
  )
  expect(fetchWithTimeout).toHaveBeenCalledWith(`${apiUrl}/rooms`, {
    mode: 'cors',
    credentials: 'include',
  }, 3000)

  // Render rooms
  rerender(<SelectRoom apiUrl={apiUrl} navigate={navigate} allowPostCredentialOrigin={targetOrigin} />)
  const { roomElements } = await waitFor(() => {
    const nidElement = screen.getByText(new RegExp(nid))
    const roomElements = rooms.map(r => screen.getByText(new RegExp(r.room)))
    return { nidElement, roomElements }
  })

  return { rerender, rooms: roomElements }
}

describe('SelectRoom', () => {

  beforeEach(() => {
    window.opener = undefined
    ;(window.comment as unknown) = undefined
  })

  test('Send message to opener if this page is saml-login window', async () => {
    const { apiUrl, navigate, response } = prepare()
    jest.mocked(fetchWithTimeout).mockResolvedValue({
      ok: true,
      json: jest.fn(async () => response),
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    jest.mocked(isAcnRoomsMessage).mockReturnValue(true)
    window.opener = {
      postMessage: jest.fn<typeof window.postMessage>(),
    }
    const defaultWindowClose = window.close
    try {
      window.close = jest.fn<typeof window.close>()

      const { rooms } = await fetchAndRender(apiUrl, navigate, response.nid, response.rooms, 'targetOrigin')
      userEvent.click(rooms[0])

      await waitFor(() => {
        expect(window.opener.postMessage).toBeCalledWith({
          type: 'acn',
          room: 'room1',
          hash: 'hash1',
        }, 'targetOrigin')
        expect(window.close).toBeCalled()
      })
    } finally {
      window.close = defaultWindowClose
    }
  })

  test('Show room list, select a room and navigate to the room', async () => {
    const { apiUrl, navigate, response } = prepare()
    jest.mocked(fetchWithTimeout).mockResolvedValue({
      ok: true,
      json: jest.fn(async () => response),
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    jest.mocked(isAcnRoomsMessage).mockReturnValue(true)

    const { rooms } = await fetchAndRender(apiUrl, navigate, response.nid, response.rooms)

    // Select a room and navigate
    const acnOkMsg: AcnOkMessage = {
      type: 'acn',
      attrs: {
        token: 'token',
      },
    }
    jest.mocked(login).mockResolvedValue(acnOkMsg)
    jest.mocked(isAcnOkMessage).mockReturnValue(true)
    userEvent.click(rooms[0])
    await waitFor(() => {
      expect(response.rooms[0]).toBeDefined()
      const { room, hash } = response.rooms[0]
      expect(login).toBeCalledWith(apiUrl, room, hash, false)
    })
    await waitFor(() => {
      expect(setToken).toBeCalledWith(acnOkMsg.attrs.token)
      expect(gotoCommentPage).toBeCalledWith(navigate)
    })
  })

  test('Login failed', async () => {
    const { apiUrl, navigate, response } = prepare()
    jest.mocked(fetchWithTimeout).mockResolvedValue({
      ok: true,
      json: jest.fn(async () => response),
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    jest.mocked(isAcnRoomsMessage).mockReturnValue(true)

    const { rerender, rooms } = await fetchAndRender(apiUrl, navigate, response.nid, response.rooms)

    // login and error message
    const acnNgMsg: ErrorMessage = {
      type: 'error',
      error: 'ACN_FAILED',
      message: 'error message',
    }
    jest.mocked(login).mockResolvedValue(acnNgMsg)
    jest.mocked(isAcnOkMessage).mockReturnValue(false)
    jest.mocked(isErrorMessage).mockReturnValue(true)
    userEvent.click(rooms[0])
    rerender(<SelectRoom apiUrl={apiUrl} navigate={navigate} allowPostCredentialOrigin='origin' />)
    await waitFor(() => {
      screen.getByText(new RegExp(acnNgMsg.message))
    })
  })

  test('Login failed with unknown message', async () => {
    const { apiUrl, navigate, response } = prepare()
    jest.mocked(fetchWithTimeout).mockResolvedValue({
      ok: true,
      json: jest.fn(async () => response),
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    jest.mocked(isAcnRoomsMessage).mockReturnValue(true)

    const { rerender, rooms } = await fetchAndRender(apiUrl, navigate, response.nid, response.rooms)

    // login and unexpecected message
    const unexpectedMessage: ErrorMessage = {
      type: 'error',
      error: 'ACN_FAILED',
      message: 'error message',
    }
    jest.mocked(login).mockResolvedValue(unexpectedMessage)
    jest.mocked(isAcnOkMessage).mockReturnValue(false)
    jest.mocked(isErrorMessage).mockReturnValue(false) // not a error message
    userEvent.click(rooms[0])
    rerender(<SelectRoom apiUrl={apiUrl} navigate={navigate} allowPostCredentialOrigin='origin' />)
    await waitFor(() => {
      screen.getByText('Login failed: {"type":"error","error":"ACN_FAILED","message":"error message"}')
    })
  })

  test('Fetch failed', async () => {
    const { apiUrl, navigate } = prepare()
    jest.mocked(fetchWithTimeout).mockResolvedValue({
      ok: false,
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    render(<SelectRoom apiUrl={apiUrl} navigate={navigate} allowPostCredentialOrigin='origin' />)
    await waitFor(() => {
      screen.getByText('Fetch failed.')
    })
  })

  test('Fetch failed with error message', async () => {
    const { apiUrl, navigate } = prepare()
    jest.mocked(fetchWithTimeout).mockResolvedValue({
      ok: true,
      json: jest.fn(async () => {
        return {
          type: 'error',
          error: 'ERROR',
          message: 'error message',
        }
      })
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    jest.mocked(isErrorMessage).mockReturnValue(true)
    jest.mocked(isAcnRoomsMessage).mockReturnValue(false)

    render(<SelectRoom apiUrl={apiUrl} navigate={navigate} allowPostCredentialOrigin='origin' />)
    await waitFor(() => {
      screen.getByText('error message')
    })
  })

  test('Fetch failed with unknown message', async () => {
    const { apiUrl, navigate } = prepare()
    jest.mocked(fetchWithTimeout).mockResolvedValue({
      ok: true,
      json: jest.fn(async () => {
        return {
          type: 'error',
          error: 'ERROR',
          message: 'error message',
        }
      })
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    jest.mocked(isErrorMessage).mockReturnValue(false)
    jest.mocked(isAcnRoomsMessage).mockReturnValue(false)

    render(<SelectRoom apiUrl={apiUrl} navigate={navigate} allowPostCredentialOrigin='origin' />)
    await waitFor(() => {
      screen.getByText('Unexpected message: {"type":"error","error":"ERROR","message":"error message"}')
    })
  })

  test('Show room list, select a room and post credential with Electron main process', async () => {
    const { apiUrl, navigate, response } = prepare()
    window.opener = jest.fn()
    window.comment = {
      ...window.comment,
      postCredential: jest.fn<typeof window.comment.postCredential>().mockResolvedValue(undefined),
    }
    window.close = jest.fn<typeof window.close>()
    const values = {
      room: 'room1',
      hash: 'hash1',
    }
    jest.mocked(fetchWithTimeout).mockResolvedValue({
      ok: true,
      json: jest.fn(async () => response),
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    jest.mocked(isAcnRoomsMessage).mockReturnValue(true)

    const { rooms } = await fetchAndRender(apiUrl, navigate, response.nid, response.rooms)

    // Select a room and post its credential
    userEvent.click(rooms[0])
    await waitFor(() => {
      expect(window.comment.postCredential).toHaveBeenCalledWith({ type: 'acn', room: values.room, hash: values.hash })
    })
    await waitFor(() => {
      expect(window.close).toHaveBeenCalled()
    })
  })

  test('Show room list, select a room and post credential with opener.postMassage', async () => {
    const { apiUrl, navigate, response } = prepare()
    // No window.comment
    window.opener = {
      postMessage: jest.fn<typeof window.opener.postMessage>(),
    }

    window.close = jest.fn<typeof window.close>()
    const values = {
      room: 'room1',
      hash: 'hash1',
    }
    jest.mocked(fetchWithTimeout).mockResolvedValue({
      ok: true,
      json: jest.fn(async () => response),
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    jest.mocked(isAcnRoomsMessage).mockReturnValue(true)

    const { rooms } = await fetchAndRender(apiUrl, navigate, response.nid, response.rooms, 'targetOrigin')

    // Select a room and post its credential
    userEvent.click(rooms[0])
    await waitFor(() => {
      expect(window.opener.postMessage).toHaveBeenCalledWith({ type: 'acn', room: values.room, hash: values.hash }, 'targetOrigin')
      expect(window.close).toHaveBeenCalled()
    })
  })
})
