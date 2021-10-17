import React from 'react'
import { getByRole, queryByText, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { LoginForm } from './LoginForm'
import { assertNotNullable } from 'common'
import { gotoCommentPage } from './utils'

jest.mock('./utils')

afterEach(() => {
  window.localStorage.clear()
})

function getRoomInput(): Element {
  const roomLabel = screen.getByText('Room')
  const room = roomLabel.parentElement
  assertNotNullable(room, 'room')
  return getByRole(room, 'textbox')
}

function getPasswordInput(): Element {
  const passwordLabel = screen.getByText('Password')
  const password = passwordLabel.parentElement
  assertNotNullable(password, 'password')
  const passwordInput = password.querySelector('input[name=\'password\']')
  assertNotNullable(passwordInput, 'passwordInput')
  return passwordInput
}

test('Room text field and its helper text', async () => {
  render(<LoginForm apiUrl="" />)
  const noInputHelperText = 'Input room name'

  const roomLabel = screen.getByText('Room')
  const room = roomLabel.parentElement
  assertNotNullable(room, 'room')
  expect(() => queryByText(room, noInputHelperText)).not.toBeNull()

  const input = getByRole(room, 'textbox')
  userEvent.type(input, 'r')
  await waitFor(() => {
    expect(queryByText(room, noInputHelperText)).toBeNull()
  })
})

test('Password field and its helper text', async () => {
  render(<LoginForm apiUrl="" />)
  const noInputHelperText = 'Input password'

  const passwordLabel = screen.getByText('Password')
  const password = passwordLabel.parentElement
  assertNotNullable(password, 'password')
  expect(() => queryByText(password, noInputHelperText)).not.toBeNull()

  const input = password.querySelector('input[name=\'password\']')
  assertNotNullable(input, 'input')
  userEvent.type(input, 'p')
  await waitFor(() => {
    expect(queryByText(password, noInputHelperText)).toBeNull()
  })
})

test('Login button is disabled if room is empty', async () => {
  render(<LoginForm apiUrl="" />)

  const roomInput = getRoomInput()
  const passwordInput = getPasswordInput()
  const button = screen.getByRole('button')

  userEvent.type(roomInput, 'r')
  userEvent.type(passwordInput, 'p')
  await waitFor(() => { expect(button).toBeEnabled() })

  userEvent.clear(roomInput)
  await waitFor(() => { expect(button).toBeDisabled() })
})

test('Login button is disabled if password is empty', async () => {
  render(<LoginForm apiUrl="" />)

  const roomInput = getRoomInput()
  const passwordInput = getPasswordInput()
  const button = screen.getByRole('button')

  userEvent.type(roomInput, 'r')
  userEvent.type(passwordInput, 'p')
  await waitFor(() => { expect(button).toBeEnabled() })

  userEvent.clear(passwordInput)
  await waitFor(() => { expect(button).toBeDisabled() })
})

test('Go to comment page if token already exists', async () => {
  window.localStorage.setItem('token', 'token')

  render(<LoginForm apiUrl="" />)

  await waitFor(() => { expect(gotoCommentPage).toBeCalled() })
})

test('Show notification if message is stored', async () => {
  const message = 'notification'
  window.localStorage.setItem('App.notification', JSON.stringify({ message }))

  render(<LoginForm apiUrl="" />)

  await waitFor(() => {
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(message)
  })
})

test('Submit crednetail then OK', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({
      type: 'acn',
      attrs: {
        token: 'token'
      }
    })
  })
  render(<LoginForm apiUrl="" />)

  const roomInput = getRoomInput()
  const passwordInput = getPasswordInput()
  const button = screen.getByRole('button')
  userEvent.type(roomInput, 'r')
  userEvent.type(passwordInput, 'p')
  await waitFor(() => { expect(button).toBeEnabled() })

  userEvent.click(button)
  await waitFor(() => {
    expect(gotoCommentPage).toBeCalled()
  })
})

test('Submit credential then failed', async () => {
  const message = 'message'
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue({
      type: 'error',
      error: 'ACN_FAILED',
      message,
    })
  })
  render(<LoginForm apiUrl="" />)

  const roomInput = getRoomInput()
  const passwordInput = getPasswordInput()
  const button = screen.getByRole('button')
  userEvent.type(roomInput, 'r')
  userEvent.type(passwordInput, 'p')
  await waitFor(() => { expect(button).toBeEnabled() })

  userEvent.click(button)
  await waitFor(() => {
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(`Login failed (${message})`)
  })
})

test('Submit credential and unexpected message', async () => {
  const unexpected = { type: 'hoge' }
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue(unexpected)
  })
  render(<LoginForm apiUrl="" />)

  const roomInput = getRoomInput()
  const passwordInput = getPasswordInput()
  const button = screen.getByRole('button')
  userEvent.type(roomInput, 'r')
  userEvent.type(passwordInput, 'p')
  await waitFor(() => { expect(button).toBeEnabled() })

  userEvent.click(button)
  await waitFor(() => {
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(`Login failed (${JSON.stringify(unexpected)})`)
  })
})
