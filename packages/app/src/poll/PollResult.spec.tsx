import { ComponentProps } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { PollResult } from './PollResult'

test('Render children only if mode is poll', () => {
  const data: ComponentProps<typeof PollResult>['data'] = {
    labels: [],
    datasets: [{ data: [0] }]
  }
  render(
    <PollResult mode="poll" data={data} onClosed={() => undefined} onTypeChanged={() => undefined}>
      <div data-testid="child" />
    </PollResult>
  )

  expect(document.body.innerHTML).toBe('<div><div data-testid="child"></div></div>')
})

test('Render children only if data is null', () => {
  render(
    <PollResult mode="poll" data={null} onClosed={() => undefined} onTypeChanged={() => undefined}>
      <div data-testid="child" />
    </PollResult>
  )

  expect(document.body.innerHTML).toBe('<div><div data-testid="child"></div></div>')
})

test('Render list/graph radio button and close button if mode is result-list', async () => {
  const data: ComponentProps<typeof PollResult>['data'] = {
    labels: [],
    datasets: [{ data: [0] }]
  }
  const onClosed = jest.fn()
  const onTypeChanged = jest.fn()
  render(
    <PollResult mode="result-list" data={data} onClosed={onClosed} onTypeChanged={onTypeChanged}>
      <div data-testid="child" />
    </PollResult>
  )

  const listButton = screen.getByLabelText('List')
  const graphButton = screen.getByLabelText('Graph')
  screen.getByTestId('child')
  expect(listButton).toBeChecked()

  userEvent.click(graphButton)
  await waitFor(() => {
    expect(graphButton).toBeChecked()
    expect(onTypeChanged).toBeCalledWith('result-graph')
  })

  userEvent.click(listButton)
  await waitFor(() => {
    expect(listButton).toBeChecked()
    expect(onTypeChanged).toBeCalledWith('result-list')
  })

  const closeButton = screen.getByRole('button', { name: 'Close' })
  userEvent.click(closeButton)
  expect(onClosed).toBeCalled()
})
