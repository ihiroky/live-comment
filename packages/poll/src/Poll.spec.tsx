import { ComponentProps } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Poll } from './Poll'
import { WebSocketClient } from 'wscomp'
import { PollMessage } from './types'
import { mocked } from 'ts-jest/utils'
import { assertNotNullable } from 'common'

jest.mock('wscomp')

let onMessage: ComponentProps<typeof WebSocketClient>['onMessage'] | null

beforeEach(() => {
  onMessage = null
  mocked(WebSocketClient).mockImplementation(
    (props: ComponentProps<typeof WebSocketClient>) => {
      props.onOpen && props.onOpen({
        _reconnectTimer: 0,
        send: jest.fn(),
        close: jest.fn(),
        reconnect: jest.fn(),
        reconnectWithBackoff: jest.fn(),
      })
      onMessage = props.onMessage
      return (
        <div data-testid="ws"></div>
      )
    })
})

test('Edit, poll and display result', async () => {
  const onCreated = jest.fn()
  const onCanceled = jest.fn()
  const onPollClosed = jest.fn()
  const onResultClosed = jest.fn()
  render(<Poll
    title="title" wsUrl="wsUrl" room="room" hash="hash"
    onCanceled={onCanceled}onCreated={onCreated} onPollClosed={onPollClosed} onResultClosed={onResultClosed}
  />)

  // Edit poll
  const titleInput = screen.getByPlaceholderText('Input title.')
  // Add description zero
  userEvent.type(titleInput, 'A title')
  const descInput0 = screen.getByPlaceholderText('Write a new entry description.')
  userEvent.type(descInput0, 'A description zero')
  const addButton0 = screen.getByRole('button', { name: 'Add' })
  userEvent.click(addButton0)
  // Add description one
  const descInput1 = screen.getByPlaceholderText('Write a new entry description.')
  userEvent.type(descInput1, 'A description one')
  const addButton1 = screen.getByRole('button', { name: 'Add' })
  userEvent.click(addButton1)
  // Remove first entry (description zero)
  const delButtons = screen.getAllByRole('button', { name: 'Del' })
  userEvent.click(delButtons[0])
  // Add description two
  const descInput2 = screen.getByPlaceholderText('Write a new entry description.')
  userEvent.type(descInput2, 'A description two')
  const addButton2 = screen.getByRole('button', { name: 'Add' })
  userEvent.click(addButton2)
  const okButton = screen.getByRole('button', { name: 'OK' })
  // Go to poll
  userEvent.click(okButton)
  expect(onCreated).toBeCalled()

  // Poll
  screen.getByText('A description one')
  screen.getByText('A description two')
  const finishButton = screen.getByRole('button', { name: 'Finish' })
  await waitFor(() => expect(onMessage).not.toBeNull())
  assertNotNullable(onMessage, 'onMessage')
  const pollMessage0: PollMessage = {
    type: 'app',
    cmd: 'poll/poll',
    from: 'c0',
    to: 'owner',
    choice: 0,
  }
  onMessage(pollMessage0)
  const pollMessage1: PollMessage = {
    type: 'app',
    cmd: 'poll/poll',
    from: 'c1',
    to: 'owner',
    choice: 1,
  }
  onMessage(pollMessage1)
  // Modification from c1
  const pollMessage2: PollMessage = {
    type: 'app',
    cmd: 'poll/poll',
    from: 'c1',
    to: 'owner',
    choice: 0,
  }
  onMessage(pollMessage2)
  // Finish polling
  userEvent.click(finishButton)
  expect(onPollClosed).toBeCalled()

  // Show result list
  const closeButton = screen.getByRole('button', { name: 'Close' })
  userEvent.click(closeButton)
  expect(onResultClosed).toBeCalled()
})

test('Cancel', async () => {
  const onCreated = jest.fn()
  const onCanceled = jest.fn()
  const onPollClosed = jest.fn()
  const onResultClosed = jest.fn()
  render(<Poll
    title="title" wsUrl="wsUrl" room="room" hash="hash"
    onCanceled={onCanceled}onCreated={onCreated} onPollClosed={onPollClosed} onResultClosed={onResultClosed}
  />)

  const cancelButton = screen.getByRole('button', { name: 'Cancel' })
  userEvent.click(cancelButton)

  expect(onCanceled).toBeCalled()
})
