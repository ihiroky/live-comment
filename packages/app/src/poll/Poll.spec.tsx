import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Poll } from './Poll'
import { PollMessage } from './types'
import { assertNotNullable } from '@/common/assert'
import { ReconnectableWebSocket } from '@/wscomp/rws'
import { jest, test, beforeEach } from '@jest/globals'

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

test('Edit, poll and display result', async () => {
  const onCreated = jest.fn()
  const onCanceled = jest.fn()
  const onPollClosed = jest.fn()
  const onResultClosed = jest.fn()

  const { rerender } = render(<Poll
    title="title" room="room" hash="hash" rws={null}
    onCanceled={onCanceled} onCreated={onCreated} onPollClosed={onPollClosed} onResultClosed={onResultClosed}
  />)

  // Edit poll
  const titleInput = screen.getByPlaceholderText('Input title.')
  // Add description zero
  userEvent.type(titleInput, '{selectall}{del}A title')
  const descInput0 = screen.getByPlaceholderText('Write a new entry description.')
  userEvent.type(descInput0, 'A description zero')
  const addButton0 = screen.getByRole('button', { name: 'Add' })
  userEvent.click(addButton0)
  await waitFor(() => {
    screen.getByText('A description zero')
  })
  // Add description one
  const descInput1 = screen.getByPlaceholderText('Write a new entry description.')
  userEvent.type(descInput1, 'A description one')
  const addButton1 = screen.getByRole('button', { name: 'Add' })
  userEvent.click(addButton1)
  await waitFor(() => {
    screen.getByText('A description one')
  })
  // Remove first entry (description zero)
  const delButtons = screen.getAllByRole('button', { name: 'Del' })
  userEvent.click(delButtons[0])
  await waitFor(async () => {
    expect(screen.queryByText('A description zero')).not.toBeInTheDocument()
  })
  // Add description two
  const descInput2 = screen.getByPlaceholderText('Write a new entry description.')
  userEvent.type(descInput2, 'A description two')
  const addButton2 = screen.getByRole('button', { name: 'Add' })
  userEvent.click(addButton2)
  await waitFor(() => {
    screen.getByText('A description two')
  })
  // Go to poll
  const okButton = screen.getByRole('button', { name: 'OK' })
  await waitFor(() => {
    expect(okButton).toBeEnabled()
  })
  userEvent.click(okButton)
  expect(onCreated).toBeCalled()

  // Poll
  rerender(<Poll
    title="title" room="room" hash="hash" rws={rws}
    onCanceled={onCanceled} onCreated={onCreated} onPollClosed={onPollClosed} onResultClosed={onResultClosed}
  />)
  await waitFor(() => {
    expect(rws.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
  })
  const onMessage = jest.mocked(rws.addEventListener).mock.calls[3][1]
  screen.getByText('A description one')
  screen.getByText('A description two')
  const pollMessage0: PollMessage = {
    type: 'app',
    cmd: 'poll/poll',
    from: 'c0',
    to: 'owner',
    choice: 0,
  }
  await act(() => {
    assertNotNullable(onMessage, 'onMessage')
    onMessage(pollMessage0)
  })
  const pollMessage1: PollMessage = {
    type: 'app',
    cmd: 'poll/poll',
    from: 'c1',
    to: 'owner',
    choice: 1,
  }
  await act(() => {
    assertNotNullable(onMessage, 'onMessage')
    onMessage(pollMessage1)
  })
  // Modification from c1
  const pollMessage2: PollMessage = {
    type: 'app',
    cmd: 'poll/poll',
    from: 'c1',
    to: 'owner',
    choice: 0,
  }
  await act(() => {
    assertNotNullable(onMessage, 'onMessage')
    onMessage(pollMessage2)
  })
  // Finish polling
  const finishButton = screen.getByRole('button', { name: 'Finish' })
  userEvent.click(finishButton)
  expect(onPollClosed).toBeCalled()

  // Show result list
  await waitFor(() => {
    screen.getByRole('button', { name: 'Close' })
  })
  const closeButton = screen.getByRole('button', { name: 'Close' })
  userEvent.click(closeButton)
  expect(onResultClosed).toBeCalled()
}, 10000)

test('Cancel', async () => {
  const onCreated = jest.fn()
  const onCanceled = jest.fn()
  const onPollClosed = jest.fn()
  const onResultClosed = jest.fn()
  render(<Poll
    title="title" room="room" hash="hash" rws={null}
    onCanceled={onCanceled}onCreated={onCreated} onPollClosed={onPollClosed} onResultClosed={onResultClosed}
  />)

  const cancelButton = screen.getByRole('button', { name: 'Cancel' })
  userEvent.click(cancelButton)

  expect(onCanceled).toBeCalled()
})
