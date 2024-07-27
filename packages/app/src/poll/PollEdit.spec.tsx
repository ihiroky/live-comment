import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { PollEdit } from './PollEdit'
import { jest, test } from '@jest/globals'

test('Render nothing if not edit mode', () => {
  render(<PollEdit
    mode="poll"
    descClass="desc"
    entryCount={1}
    onEntryAdded={() => undefined}
    onOk={() => undefined}
    onCanceled={() => undefined}
  />)

  expect(document.body.innerHTML).toBe('<div></div>')
})

test('Enter description and click add button, then onEntryAdded is called and description is cleared', async () => {
  const onEntryAdded = jest.fn()
  render(<PollEdit
    mode="edit"
    descClass="desc"
    entryCount={0}
    onEntryAdded={onEntryAdded}
    onOk={() => undefined}
    onCanceled={() => undefined}
  />)

  const desctiption = screen.getByRole('textbox')
  const addButton = screen.getByRole('button', { name: 'Add' })
  userEvent.type(desctiption, 'A description.')
  await waitFor(() => {
    expect(addButton).toBeEnabled()
  })
  userEvent.click(addButton)
  expect(onEntryAdded).toBeCalledWith('A description.')
  await waitFor(() => {
    expect((desctiption as HTMLTextAreaElement).value).toBe('')
  })
})

test('OK button is disabled if entryCount is zero', () => {
  render(<PollEdit
    mode="edit"
    descClass="desc"
    entryCount={0}
    onEntryAdded={() => undefined}
    onOk={() => undefined}
    onCanceled={() => undefined}
  />)

  const okButton = screen.getByRole('button', { name: 'OK' })
  expect(okButton).toBeDisabled()
})

test('OK button is enabled if entryCount >= 1, and click it then onOk is called', () => {
  const onOk = jest.fn()
  render(<PollEdit
    mode="edit"
    descClass="desc"
    entryCount={1}
    onEntryAdded={() => undefined}
    onOk={onOk}
    onCanceled={() => undefined}
  />)

  const okButton = screen.getByRole('button', { name: 'OK' })
  userEvent.click(okButton)
  expect(onOk).toBeCalled()
})

test('Click cancel button then onCancel is called', () => {
  const onCanceled = jest.fn()
  render(<PollEdit
    mode="edit"
    descClass="desc"
    entryCount={0}
    onEntryAdded={() => undefined}
    onOk={() => undefined}
    onCanceled={onCanceled}
  />)

  const cancelButton = screen.getByRole('button', { name: 'Cancel' })
  userEvent.click(cancelButton)
  expect(onCanceled).toBeCalled()
})
