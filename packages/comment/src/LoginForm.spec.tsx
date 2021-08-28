import React from 'react'
import { getByRole, queryByText, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { LoginForm } from './LoginForm'
import { assertNotNullable } from 'common'

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
  render(<LoginForm />)
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
  render(<LoginForm />)
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
  render(<LoginForm />)

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
  render(<LoginForm />)

  const roomInput = getRoomInput()
  const passwordInput = getPasswordInput()
  const button = screen.getByRole('button')

  userEvent.type(roomInput, 'r')
  userEvent.type(passwordInput, 'p')
  await waitFor(() => { expect(button).toBeEnabled() })

  userEvent.clear(passwordInput)
  await waitFor(() => { expect(button).toBeDisabled() })
})
