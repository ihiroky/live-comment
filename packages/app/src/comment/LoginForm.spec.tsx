import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { jest, test } from '@jest/globals'
import { LoginForm } from './LoginForm'
import { createHash } from '@/common/utils'
import { assertNotNullable } from '@/common/assert'
import { login, gotoCommentPage, setToken, getToken, goto } from './utils/pages'
import { serverConfigStore } from './utils/serverConfigStore'
import { AcnOkMessage, ErrorMessage } from '@/common/Message'

jest.mock('./utils/pages')
jest.mock('./utils/serverConfigStore')

afterEach(() => {
  window.localStorage.clear()
})

function getPasswordInput(): Element {
  const passwordInput = document.querySelector('input[name=\'password\']')
  assertNotNullable(passwordInput, 'passwordInput')
  return passwordInput
}

test('Room text field and its helper text', async () => {
  jest.mocked(serverConfigStore.getSnapshot).mockReturnValue({ samlEnabled: false })

  render(<LoginForm apiUrl="" />)

  const input = screen.getByRole('textbox')
  userEvent.type(input, 'r')
  userEvent.type(input, '{selectall}{backspace}')
  await waitFor(() => {
    const helperText = screen.getByText(/Input room name/)
    expect(helperText).toBeVisible()
  })
})

test('Password field and its helper text', async () => {
  jest.mocked(serverConfigStore.getSnapshot).mockReturnValue({ samlEnabled: false })

  render(<LoginForm apiUrl="" />)

  const input = document.querySelector('input[name=\'password\']')
  assertNotNullable(input, 'input')
  userEvent.type(input, 'p')
  userEvent.type(input, '{selectall}{backspace}')
  await waitFor(() => {
    const helperText = screen.getByText(/Input password/)
    expect(helperText).toBeVisible()
  })
})

test('Login button is disabled if room is empty', async () => {
  jest.mocked(serverConfigStore.getSnapshot).mockReturnValue({ samlEnabled: false })

  render(<LoginForm apiUrl="" />)

  const roomInput = screen.getByRole('textbox')
  const passwordInput = getPasswordInput()
  const button = screen.getByRole('button')

  userEvent.type(roomInput, 'r')
  userEvent.type(passwordInput, 'p')
  await waitFor(() => { expect(button).toBeEnabled() })

  userEvent.clear(roomInput)
  await waitFor(() => { expect(button).toBeDisabled() })
})

test('Login button is disabled if password is empty', async () => {
  jest.mocked(serverConfigStore.getSnapshot).mockReturnValue({ samlEnabled: false })

  render(<LoginForm apiUrl="" />)

  const roomInput = screen.getByRole('textbox')
  const passwordInput = getPasswordInput()
  const button = screen.getByRole('button')

  userEvent.type(roomInput, 'r')
  userEvent.type(passwordInput, 'p')
  await waitFor(() => { expect(button).toBeEnabled() })

  userEvent.clear(passwordInput)
  await waitFor(() => { expect(button).toBeDisabled() })
})

test('Go to comment page if valid token exists', async () => {
  // exp: 9999999999999
  jest.mocked(getToken).mockReturnValue('ewogICJhbGciOiAiSFMyNTYiLAogICJ0eXAiOiAiSldUIgp9.ewogICJyb29tIjogInJvb20iLAogICJleHAiOiA5OTk5OTk5OTk5OTk5Cn0')
  jest.mocked(serverConfigStore.getSnapshot).mockReturnValue({ samlEnabled: false })

  render(<LoginForm apiUrl="" />)

  await waitFor(() => {
    expect(login).not.toBeCalled()
    expect(gotoCommentPage).toBeCalled()
  })
})

test('Show notification if message is stored', async () => {
  const message = 'notification'
  window.localStorage.setItem('App.notification', JSON.stringify({ message }))
  jest.mocked(getToken).mockReturnValue(null)
  jest.mocked(serverConfigStore.getSnapshot).mockReturnValue({ samlEnabled: false })

  const { rerender } = render(<LoginForm apiUrl="" />)
  rerender(<LoginForm apiUrl="" />)

  await waitFor(() => {
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(message)
  })
})

test('Submit crednetail then OK', async () => {
  jest.mocked(login).mockResolvedValue({
    type: 'acn',
    attrs: {
      token: 'token'
    }
  } as AcnOkMessage)
  jest.mocked(serverConfigStore.getSnapshot).mockReturnValue({ samlEnabled: false })
  render(<LoginForm apiUrl="apiUrl" />)

  const roomInput = screen.getByRole('textbox')
  const passwordInput = getPasswordInput()
  const button = screen.getByRole('button')
  userEvent.type(roomInput, 'r')
  userEvent.type(passwordInput, 'p')
  await waitFor(() => { expect(button).toBeEnabled() })

  userEvent.click(button)
  await waitFor(() => {
    expect(login).toBeCalledWith('apiUrl', 'r', createHash('p'), false)
    expect(gotoCommentPage).toBeCalled()
  })
})

test('Submit credential then failed', async () => {
  const message = 'message'
  jest.mocked(login).mockResolvedValue({
    type: 'error',
    error: 'ACN_FAILED',
    message,
  } as ErrorMessage)
  jest.mocked(serverConfigStore.getSnapshot).mockReturnValue({ samlEnabled: false })
  render(<LoginForm apiUrl="" />)

  const roomInput = screen.getByRole('textbox')
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unexpected = { type: 'hoge' } as any
  jest.mocked(login).mockResolvedValue(unexpected)
  jest.mocked(serverConfigStore.getSnapshot).mockReturnValue({ samlEnabled: false })
  render(<LoginForm apiUrl="" />)

  const roomInput = screen.getByRole('textbox')
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

test('Keep login', async () => {
  jest.mocked(login).mockResolvedValue({
    type: 'acn',
    attrs: {
      token: 'token',
    },
  } as AcnOkMessage)
  jest.mocked(serverConfigStore.getSnapshot).mockReturnValue({ samlEnabled: false })
  const navigate = jest.fn()
  render(<LoginForm apiUrl="apiUrl" navigate={navigate} />)

  const roomInput = screen.getByRole('textbox')
  const passwordInput = getPasswordInput()
  const checkbox = screen.getByRole('checkbox')
  const button = screen.getByRole('button')
  userEvent.click(checkbox)
  userEvent.type(roomInput, 'r')
  userEvent.type(passwordInput, 'p')
  await waitFor(() => { expect(button).toBeEnabled() })

  userEvent.click(button)
  await waitFor(() => {
    expect(login).toBeCalledWith('apiUrl', 'r', createHash('p'), true)
    expect(setToken).toBeCalledWith('token')
    expect(gotoCommentPage).toBeCalledWith(navigate)
  })
})

test('SAML login', async () => {
  jest.mocked(serverConfigStore.getSnapshot).mockReturnValue({ samlEnabled: false })
  const { rerender} = render(<LoginForm apiUrl="apiUrl" />)
  jest.mocked(serverConfigStore.getSnapshot).mockReturnValue({ samlEnabled: true })
  rerender(<LoginForm apiUrl="apiUrl" />)

  const ssoLoginButton = await waitFor(() => screen.getByText(/SSO Login/))

  userEvent.click(ssoLoginButton)
  await waitFor(() => {
    expect(goto).toBeCalledWith('apiUrl/saml/login')
  })
})
