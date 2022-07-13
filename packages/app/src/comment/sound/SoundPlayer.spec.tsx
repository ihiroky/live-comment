import { SoundPlayer } from './SoundPlayer'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePlaySound, useSoundMetadata } from './hooks'
import { PlaySoundMessage } from '../types'
import { sign } from 'jsonwebtoken'

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

test('Send message to play sound if icon is clicked', async () => {
  jest.mocked(usePlaySound).mockReturnValue(jest.fn())
  const token = sign({ room: 'room' }, 'hoge')
  window.localStorage.setItem('token', token)
  jest.mocked(useSoundMetadata).mockReturnValue([
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
