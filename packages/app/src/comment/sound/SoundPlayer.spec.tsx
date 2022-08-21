import { SoundPlayer } from './SoundPlayer'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { usePlaySound, useSoundMetadata } from './hooks'
import { PlaySoundMessage } from '@/sound/types'
import { sign } from 'jsonwebtoken'
import { jest, test, afterEach } from '@jest/globals'

jest.mock('./hooks')

afterEach(() => {
  window.localStorage.clear()
})

test('Page title', () => {
  const token = sign({ room: 'room' }, 'hoge')
  window.localStorage.setItem('token', token)
  jest.mocked(usePlaySound).mockReturnValue(jest.fn())
  jest.mocked(useSoundMetadata).mockReturnValue([])

  render(<SoundPlayer url="https://localhost" />)

  const title = screen.getByRole('heading')
  expect(title.textContent).toBe('Ding Dong Ding! 🔔')
})

test('Show/hide preferences if switch toggles', async () => {
  const token = sign({ room: 'room' }, 'hoge')
  window.localStorage.setItem('token', token)
  jest.mocked(usePlaySound).mockReturnValue(jest.fn())
  jest.mocked(useSoundMetadata).mockReturnValue([])

  render(<SoundPlayer url="https://localhost" />)

  const toggle = screen.getByLabelText('Show preferences')
  userEvent.click(toggle)
  await waitFor(() => {
    screen.getByText(/Volume:/)
    screen.getByText(/Sound:/)
  })

  userEvent.click(toggle)
  await waitFor(() => {
    const v = screen.queryByText(/Volume:/)
    expect(v).toBeNull()
    const s = screen.queryByText(/Sound:/)
    expect(s).toBeNull()
  })
})

test('Send message to play sound if icon is clicked, and the button is disabled right after first click', async () => {
  jest.mocked(usePlaySound).mockReturnValue(jest.fn())
  const token = sign({ room: 'room' }, 'hoge')
  window.localStorage.setItem('token', token)
  jest.mocked(useSoundMetadata).mockReturnValue([
    { id0: { id: 'id0', displayName: 'dn0', command: [] }},
    {}
  ])
  window.parent.postMessage = jest.fn()

  const { rerender } = render(<SoundPlayer url="https://localhost/" />)

  const icon = screen.getByTestId('play-id0')
  userEvent.click(icon)

  const message: PlaySoundMessage = {
    type: 'app',
    cmd: 'sound/play',
    id: 'id0'
  }
  await waitFor(() => expect(window.parent.postMessage).toBeCalledWith(message, window.location.origin))

  rerender(<SoundPlayer url="https://localhost/" />)
  expect(icon).toBeDisabled()
})

test('Receive message to play sound', async () => {
  const playSoundMock = jest.fn()
  jest.mocked(usePlaySound).mockReturnValue(playSoundMock)
  const token = sign({ room: 'room '}, 'hoge')
  window.localStorage.setItem('token', token)
  jest.mocked(useSoundMetadata).mockReturnValue([
    { id0: { id: 'id0', displayName: 'dn0', command: [] }},
    {}
  ])
  window.addEventListener = jest.fn()

  const { rerender } = render(<SoundPlayer url="https://localhost" />)
  rerender(<SoundPlayer url="https://localhost" />)

  const listeners = jest.mocked(window.addEventListener).mock.calls.filter(c => c[0] === 'message')
  expect(listeners.length).toBe(1)
  const listener = listeners[0][1]
  if (typeof listener !== 'function') {
    throw new Error()
  }
  const unexpectedOriginEvent = new MessageEvent('message', {
    origin: window.location.origin + 'hogefuga'
  })
  listener(unexpectedOriginEvent)
  expect(playSoundMock).not.toBeCalled()

  const noPlaySoundMessage = new MessageEvent('message', {
    origin: window.location.origin,
    data: {}
  })
  listener(noPlaySoundMessage)
  expect(playSoundMock).not.toBeCalled()

  const validPlaySoundMessage = new MessageEvent('message', {
    origin: window.location.origin,
    data: {
      type: 'app',
      cmd: 'sound/play',
      id: 'id',
    }
  })
  listener(validPlaySoundMessage)
  expect(playSoundMock).toBeCalledWith('id', expect.any(Number), expect.any(Function))
})