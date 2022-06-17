import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReconnectableWebSocket } from '@/wscomp/rws'
import { Polling } from './Polling'
import { PollEntry } from './types'

let rws: ReconnectableWebSocket

beforeEach(() => {
  rws = {
    send: jest.fn(),
    close: jest.fn(),
    reconnect: jest.fn(),
    reconnectWithBackoff: jest.fn(),
    get readyState(): number {
      return 0
    },
    get url(): string {
      return 'dummy_url'
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }
})

test('Click Finish button, then call onFinished', () => {
  const entries: PollEntry[] = [
    { key: 1, description: 'desc1', count: 1 },
    { key: 2, description: 'desc2', count: 2 },
  ]
  const onChange = jest.fn()
  const onFinishded = jest.fn()
  render(
    <Polling
      room="room" hash="hash" title="title" entries={entries} rws={rws}
      onChange={onChange} onFinished={onFinishded}
    />
  )
  const finishButton = screen.getByRole('button', { name: 'Finish' })
  userEvent.click(finishButton)

  expect(onFinishded).toBeCalled()
})

test('Add event listener to rws', async () => {
  const entries: PollEntry[] = [
    { key: 1, description: 'desc1', count: 1 },
    { key: 2, description: 'desc2', count: 2 },
  ]
  const onChange = jest.fn()
  const onFinishded = jest.fn()
  const { rerender, unmount } = render(
    <Polling
      room="room" hash="hash" title="title" entries={entries} rws={null}
      onChange={onChange} onFinished={onFinishded}
    />
  )

  rerender(<Polling
    room="room" hash="hash" title="title" entries={entries} rws={rws}
    onChange={onChange} onFinished={onFinishded}
  />)
  await waitFor(() => {
    expect(rws.addEventListener).toBeCalledWith('open', expect.any(Function))
    expect(rws.addEventListener).toBeCalledWith('close', expect.any(Function))
    expect(rws.addEventListener).toBeCalledWith('error', expect.any(Function))
    expect(rws.addEventListener).toBeCalledWith('message', expect.any(Function))
  })

  unmount()
  await waitFor(() => {
    expect(rws.removeEventListener).toBeCalledWith('message', expect.any(Function))
    expect(rws.removeEventListener).toBeCalledWith('error', expect.any(Function))
    expect(rws.removeEventListener).toBeCalledWith('close', expect.any(Function))
    expect(rws.removeEventListener).toBeCalledWith('open', expect.any(Function))
  })
})