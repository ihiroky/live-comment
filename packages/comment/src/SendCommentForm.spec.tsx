import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SendCommentForm } from './SendCommentForm'
import '@testing-library/jest-dom'

test('Input text and click button.', async () => {
  const onSubmit = jest.fn()
  render(<SendCommentForm onSubmit={onSubmit} sendWithCtrlEnter={false} />)

  const inputText = 'some text.'
  const textBox = screen.getByRole('textbox', { name: '' }) as HTMLInputElement
  userEvent.type(textBox, inputText)
  const button = screen.getByRole('button', { name: '💬' })
  await waitFor(() => expect(button).toBeEnabled())
  userEvent.click(button)
  await waitFor(() => expect(textBox.value).toBe(''))

  expect(onSubmit).toBeCalledWith({
    type: 'comment',
    comment: inputText,
  })
})

test('Input text and press Enter key.', async () => {
  const onSubmit = jest.fn()
  render(<SendCommentForm onSubmit={onSubmit} sendWithCtrlEnter={false}/>)

  const inputText = 'any text.'
  const textBox = screen.getByRole('textbox', { name: '' }) as HTMLInputElement
  userEvent.type(textBox, inputText)
  const button = screen.getByRole('button', { name: '💬' })
  await waitFor(() => expect(button).toBeEnabled())
  userEvent.keyboard('{enter}')
  await waitFor(() => expect(textBox.value).toBe(''))

  expect(onSubmit).toBeCalledWith({
    type: 'comment',
    comment: inputText,
  })
})

test('Input text and click button with "send with ctrl+enter" option.', async () => {
  const onSubmit = jest.fn()
  render(<SendCommentForm onSubmit={onSubmit} sendWithCtrlEnter={true} />)

  const inputText = 'some text.'
  const textBox = screen.getByRole('textbox', { name: '' }) as HTMLInputElement
  userEvent.type(textBox, inputText)
  const button = screen.getByRole('button', { name: '💬' })
  await waitFor(() => expect(button).toBeEnabled())
  userEvent.click(button)
  await waitFor(() => expect(textBox.value).toBe(''))

  expect(onSubmit).toBeCalledWith({
    type: 'comment',
    comment: inputText,
  })
})

test('Input text and press Enter key only with "send with ctrl+enter" option.', async () => {
  const onSubmit = jest.fn()
  render(<SendCommentForm onSubmit={onSubmit} sendWithCtrlEnter={true}/>)

  const inputText = 'any text.'
  const textBox = screen.getByRole('textbox', { name: '' }) as HTMLInputElement
  userEvent.type(textBox, inputText)
  const button = screen.getByRole('button', { name: '💬' })
  await waitFor(() => expect(button).toBeEnabled())
  userEvent.keyboard('{enter}')

  // Status does not change even if I wait a while
  await new Promise(resolve => { setTimeout(resolve, 100) })
  expect(textBox.value).not.toBe('')
  expect(onSubmit).not.toBeCalled()
})

test('Input text and press Ctrl+Enter key with "send with ctrl+enter" option.', async () => {
  const onSubmit = jest.fn()
  render(<SendCommentForm onSubmit={onSubmit} sendWithCtrlEnter={true}/>)

  const inputText = 'any text.'
  const textBox = screen.getByRole('textbox', { name: '' }) as HTMLInputElement
  userEvent.type(textBox, inputText)
  const button = screen.getByRole('button', { name: '💬' })
  await waitFor(() => expect(button).toBeEnabled())
  userEvent.keyboard('{ctrl}{enter}{/ctrl}')
  await waitFor(() => expect(textBox.value).toBe(''))

  expect(onSubmit).toBeCalledWith({
    type: 'comment',
    comment: inputText,
  })
})