import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { General } from './General'
import { ScreenProps } from './types'

function prepare() {
  const props = {
    url: { data: '', error: false },
    room: { data: '', error: false },
    password: { data: '', error: false },
    screen: { data: 0, error: false },
    duration: { data: '0', error: false },
    zoom: { data: '0', error: false },
    fontColor: { data: '', error: false },
    fontBorderColor: { data: '', error: false },
    gpu: { data: false, error: false },
    onUpdate: jest.fn(),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window.settings = {
    getScreenPropsList: () => {
      return new Promise<ScreenProps[]>((resolve: (sp: ScreenProps[]) => void): void => {
        resolve([
          { name: 's0', thumbnailDataUrl: 'data:s0' },
          { name: 's1', thumbnailDataUrl: 'data:s1' },
          { name: 's2', thumbnailDataUrl: 'data:s2' },
        ])
      })
    },
    requestSettings: jest.fn(),
    postSettings: jest.fn(),
  }

  return props
}

test('Url field update', async () => {
  const props = prepare()

  // Normal update
  const { rerender } = render(<General {...props} url={{ data: 'wss://a', error: false }} />)
  const url0 = screen.getByLabelText('Server URL')
  userEvent.type(url0, 'a')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('url', 'wss://aa', false))

  // Validation error
  rerender(<General {...props} url={{ data: 'wss://a', error: false }} />)
  const url1 = screen.getByLabelText('Server URL')
  userEvent.type(url1, '{backspace}')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('url', 'wss://', true))

  // Error message
  rerender(<General {...props} url={{ data: 'wss://', error: true }} />)
  screen.getByText('Input URL like "wss://hoge/app".')
})

test('Room field update', async () => {
  const props = prepare()

  // Normal update
  const { rerender } = render(<General {...props} room={{ data: 'room', error: false }} />)
  const room0 = screen.getByLabelText('Room')
  userEvent.type(room0, '0')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('room', 'room0', false))

  // Validation error (empty)
  rerender(<General {...props} room={{ data: 'r', error: false }} />)
  const room1 = screen.getByLabelText('Room')
  userEvent.type(room1, '{backspace}')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('room', '', true))

  // Error message
  rerender(<General {...props} room={{ data: '', error: true }} />)
  screen.getByText('Input room name.')
})

test('Password field update', async () => {
  const props = prepare()

  // Normal update
  const { rerender } = render(<General {...props} password={{ data: 'pw', error: false }} />)
  const pw0 = screen.getByLabelText('Password')
  userEvent.type(pw0, '0')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('password', 'pw0', false))

  // Validation error (empty)
  rerender(<General {...props} password={{ data: 'p', error: false }} />)
  const pw1 = screen.getByLabelText('Password')
  userEvent.type(pw1, '{backspace}')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('password', '', true))

  // Error message
  rerender(<General {...props} password={{ data: '', error: true }} />)
  screen.getByText('Input password.')
})

test('Message duration field update', async () => {
  const props = prepare()

  // Normal update
  const { rerender } = render(<General {...props} duration={{ data: '7', error: false }} />)
  const duration0 = screen.getByLabelText('Message duration (seconds)')
  userEvent.type(duration0, '{selectall}5')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('duration', '5', false))

  // Validation error (empty)
  rerender(<General {...props} duration={{ data: '7', error: false }} />)
  const duration1 = screen.getByLabelText('Message duration (seconds)')
  userEvent.type(duration1, '{backspace}')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('duration', '', true))
  // Validation error (non number)
  rerender(<General {...props} duration={{ data: '7', error: false }} />)
  const duration2 = screen.getByLabelText('Message duration (seconds)')
  userEvent.type(duration2, 'z')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('duration', '7z', true))

  // Error message
  rerender(<General {...props} duration={{ data: 'z', error: true }}/>)
  screen.getByText('Must be >= 3.')
})

test('Zoom field update', async () => {
  const props = prepare()

  // Normal update
  const { rerender } = render(<General {...props} zoom={{ data: '300', error: false }} />)
  const zoom0 = screen.getByLabelText('Zoom (%)')
  userEvent.type(zoom0, '{backspace}')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('zoom', '30', false))

  // Validation error (lower bound)
  rerender(<General {...props} zoom={{ data: '290', error: false }}/>)
  const zoom1 = screen.getByLabelText('Zoom (%)')
  userEvent.type(zoom1, '{backspace}')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('zoom', '29', true))
  // Validation error (upper bound)
  rerender(<General {...props} zoom={{ data: '50', error: false }}/>)
  const zoom2 = screen.getByLabelText('Zoom (%)')
  userEvent.type(zoom2, '1}')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('zoom', '501', true))
  // Validation error (non number)
  rerender(<General {...props} zoom={{ data: '290', error: false }}/>)
  const zoom3 = screen.getByLabelText('Zoom (%)')
  userEvent.type(zoom3, 'a')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('zoom', '290a', true))

  // Error message
  rerender(<General {...props} zoom={{ data: '', error: true }}/>)
  screen.getByText('Must be >= 30 and <= 500.')
})

test('fontColor field update', async () => {
  const props = prepare()

  const { rerender } = render(<General {...props} fontColor={{ data: '#ccc', error: false }} />)
  const fc0 = screen.getByLabelText('Font color (color name or #hex)')
  userEvent.type(fc0, 'c')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('fontColor', '#cccc', false))

  // Validation error (empty)
  rerender(<General {...props} fontColor={{ data: '#', error: false }} />)
  const fc1 = screen.getByLabelText('Font color (color name or #hex)')
  userEvent.type(fc1, '{backspace}')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('fontColor', '', true))

  // Error message
  rerender(<General {...props} fontColor={{ data: '', error: true }} />)
  screen.getByText('Input color.')
})

test('fontBorderColor field update', async () => {
  const props = prepare()

  render(<General {...props} fontBorderColor={{ data: '#ccc', error: false }} />)
  const fc0 = screen.getByLabelText('Font border color (color name or #hex, empty if no border)')
  userEvent.type(fc0, 'c')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('fontBorderColor', '#cccc', false))
})

test('Enable GPU acceleration update', async () => {
  const props = prepare()

  const { rerender } = render(<General {...props} />)
  const gpu0 = screen.getByLabelText('Enable GPU Acceleration (restart me to enable)')
  userEvent.click(gpu0)
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('gpu', 'true', false))

  rerender(<General {...props} gpu={{ data: true, error: false }} />)
  const gpu1 = screen.getByLabelText('Enable GPU Acceleration (restart me to enable)')
  userEvent.click(gpu1)
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('gpu', 'false', false))
})

test('Screen selector', async () => {
  const props = prepare()

  render(<General {...props} screen={{ data: 0, error: false }} />)
  const screen0 = await waitFor(() => screen.getByRole('button', { name: 's0' }))
  userEvent.click(screen0)
  const listbox = within(screen.getByRole('listbox'))
  const items = listbox.getAllByText(/s[0-9]/i)

  expect(items[0].textContent).toBe('s0')
  expect(items[1].textContent).toBe('s1')
  expect(items[2].textContent).toBe('s2')
  // TODO Select an item
})
