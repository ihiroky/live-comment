import { getByRole, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { PollControl } from './PollControl'
import { AppState } from './types'
import { jest, test, expect, beforeEach } from '@jest/globals'

let poll: AppState['polls'][number]

beforeEach(() => {
  poll = {
    key: 123,
    owner: 'owner',
    id: 'pollid',
    title: 'polltitle',
    entries: [
      { key: 0, description: 'desc0' },
      { key: 1, description: 'desc1' },
      { key: 2, description: 'desc2' },
    ]
  }
})

test('Poll start message.', () => {
  render(<PollControl poll={poll} onPoll={() => undefined} onClosePoll={() => undefined} />)

  const status = screen.getByRole('status')

  expect(status.textContent).toBe(
    `Presenter starts a poll! [id:${poll.id}] Click the number you choose.`
  )
})

test('Poll title.', () => {
  render(<PollControl poll={poll} onPoll={() => undefined} onClosePoll={() => undefined} />)

  const heading = screen.getByRole('heading')

  expect(heading.textContent).toBe(poll.title)
})

test('Poll entries and poll buttons fire onPoll events.', () => {
  const onPoll = jest.fn()
  render(<PollControl poll={poll} onPoll={onPoll} onClosePoll={() => undefined} />)

  const entries = screen.getAllByRole('listitem')

  expect(entries.length).toBe(poll.entries.length)
  entries.map((e, i) => {
    const button = getByRole(e, 'button', { name: String(i + 1) })

    expect(button.nextSibling?.textContent).toBe(poll.entries[i].description)

    userEvent.click(button)
    expect(onPoll).toBeCalledWith(expect.anything(), poll.entries[i].key, poll.owner)
  })
})

test('Poll close button fires a onClosePoll event', () => {
  const onClosePoll = jest.fn()
  render(<PollControl poll={poll} onPoll={() => undefined} onClosePoll={onClosePoll} />)

  const closeButton = screen.getByRole('button', { name: 'Close' })

  userEvent.click(closeButton)
  expect(onClosePoll).toBeCalledWith(poll.id)
})
