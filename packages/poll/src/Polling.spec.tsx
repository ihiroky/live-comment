import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Polling } from './Polling'
import { WebSocketClient } from 'common/src/WebSocketClient'
import { PollEntry } from '.'

jest.mock('common/src/WebSocketClient')

beforeEach(() => {
  (WebSocketClient as jest.Mock).mockImplementation(
    (props: React.ComponentProps<typeof WebSocketClient>) => {
      props.onOpen && props.onOpen({
        _reconnectTimer: 0,
        send: jest.fn(),
        close: jest.fn(),
        reconnect: jest.fn(),
        reconnectWithBackoff: jest.fn(),
      })
      return (
        <div></div>
      )
    })
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
      url="url" room="room" hash="hash" title="title" entries={entries}
      onChange={onChange} onFinished={onFinishded}
    />
  )
  const finishButton = screen.getByRole('button', { name: 'Finish' })
  userEvent.click(finishButton)

  expect(onFinishded).toBeCalled()
})
