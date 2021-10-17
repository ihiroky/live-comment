import React from 'react'
import { SoundPlayer } from './SoundPlayer'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePlaySound, useSoundMetadata } from './hooks'
import { mocked } from 'ts-jest/utils'
import { PlaySoundMessage } from '../types'


jest.mock('./hooks')

function waitAsync(ms: number): Promise<void> {
  return new Promise<void>((resolve: () => void): void => {
    setTimeout(resolve, ms)
  })
}

afterEach(() => {
  window.localStorage.clear()
})

test('Page title', () => {
  window.localStorage.setItem('token', 'token')
  mocked(usePlaySound).mockReturnValue(jest.fn())
  mocked(useSoundMetadata).mockReturnValue([])

  render(<SoundPlayer url="https://localhost" />)

  const title = screen.getByRole('heading')
  expect(title.textContent).toBe('Ding Dong Ring! 🔔')
})

test('Volume is changed if move slider', async () => {
  const playSoundMock = jest.fn()
  mocked(usePlaySound).mockReturnValue(playSoundMock)
  window.localStorage.setItem('token', 'token')
  mocked(useSoundMetadata).mockReturnValue([
    { id0: { id: 'id0', displayName: 'dn0', command: [] }},
    {}
  ])

  render(<SoundPlayer url="https://localhost/" />)

  const slider = screen.getByLabelText('Volume')
  // (150, 150) may be the position slider value is 100.
  userEvent.click(slider, { clientX: 150, clientY: 150 })
  // Receive message to play sound
  const message: PlaySoundMessage = {
    type: 'app',
    cmd: 'sound/play',
    id: 'id',
  }
  // event.origin gets empty if use window.postMessage().
  // So use MessageEvent/dispatchEvent to avoid it.
  const e = new MessageEvent('message', { data: message, origin: window.location.origin })
  window.dispatchEvent(e)

  await waitFor(() => expect(playSoundMock).toBeCalledWith('id', 100, expect.any(Function)))
})

test('Change max number of sound being played concurrently', async () => {
  const playSoundMock = jest.fn()
  mocked(usePlaySound).mockReturnValue(playSoundMock)
  window.localStorage.setItem('token', 'token')
  mocked(useSoundMetadata).mockReturnValue([
    { id0: { id: 'id0', displayName: 'dn0', command: [] }},
    {}
  ])

  render(<SoundPlayer url="https://localhost/" />)

  // Select '1' in MUI Select
  const select = screen.getByLabelText('Max plays:')
  userEvent.type(select, '{selectall}{enter}')
  userEvent.click(screen.getByText('1'))
  await waitAsync(50)

  // Receive message to play sound
  const message: PlaySoundMessage = {
    type: 'app',
    cmd: 'sound/play',
    id: 'id',
  }
  // event.origin gets empty if use window.postMessage().
  // So use MessageEvent/dispatchEvent to avoid it.
  const e = new MessageEvent('message', { data: message, origin: window.location.origin })
  // Send twice.
  window.dispatchEvent(e)
  window.dispatchEvent(e)

  // But playSound is called once.
  await waitAsync(50)
  expect(playSoundMock).toBeCalledWith('id', 33, expect.any(Function))
  expect(playSoundMock).toBeCalledTimes(1)
})

test('Send message to play sound if icon is clicked', async () => {
  mocked(usePlaySound).mockReturnValue(jest.fn())
  window.localStorage.setItem('token', 'token')
  mocked(useSoundMetadata).mockReturnValue([
    { id0: { id: 'id0', displayName: 'dn0', command: [] }},
    {}
  ])
  window.parent.postMessage = jest.fn()

  render(<SoundPlayer url="https://localhost/" />)

  const icon = screen.getByTestId('play-id0')
  userEvent.click(icon)

  const message: PlaySoundMessage = {
    type: 'app',
    cmd: 'sound/play',
    id: 'id0'
  }
  await waitFor(() => expect(window.parent.postMessage).toBeCalledWith(message, window.location.origin))
})
