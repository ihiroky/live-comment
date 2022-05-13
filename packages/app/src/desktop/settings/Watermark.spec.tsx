import { render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import { Watermark } from './Watermark'
import { WatermarkPosition } from './types'

function createProps() {
  const position: WatermarkPosition = 'bottom-right'
  return {
    html: { data: '', error: false },
    opacity: { data: '', error: false },
    color: { data: '', error: false },
    fontSize: { data: '', error: false },
    position: { data: position, error: false },
    offset:  { data: '', error: false },
    noComments:  { data: false, error: false },
    onUpdate: jest.fn(),
  }
}

test('html field update', async () => {
  const props = createProps()

  render(<Watermark {...props} html={{ data: '<div>a</div>', error: false}} />)
  const html = screen.getByLabelText('Text or HTML')
  userEvent.type(html, 'a')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('html', '<div>a</div>a', false))
})

test('opacity field update', async () => {
  const props = createProps()

  // Normal update
  const { rerender } = render(<Watermark {...props} opacity={{ data: '0', error: false }} />)
  const opacity0 = screen.getByLabelText('Opacity')
  userEvent.type(opacity0, '{selectall}1')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('opacity', '1', false))

  // Validation error (empty)
  rerender(<Watermark {...props} opacity={{ data: '0', error: false}} />)
  const opacity1 = screen.getByLabelText('Opacity')
  userEvent.type(opacity1, '{backspace}')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('opacity', '', true))
  // Validation error (invalid range)
  rerender(<Watermark {...props} opacity={{ data: '', error: false }} />)
  const opacity2 = screen.getByLabelText('Opacity')
  userEvent.type(opacity2, '2')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('opacity', '2', true))

  // Error message
  rerender(<Watermark {...props} opacity={{ data: '', error: true }} />)
  screen.getByText('Between 0 and 1.')
})

test('color field update', async () => {
  const props = createProps()

  // Normal update
  const { rerender } = render(<Watermark {...props} color={{ data: '#000', error: false }} />)
  const color0 = screen.getByLabelText('Color (name or #hex)')
  userEvent.type(color0, '0')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('color', '#0000', false))

  // Validation error (empty)
  rerender(<Watermark {...props} color={{ data: '#', error: false }} />)
  const color1 = screen.getByLabelText('Color (name or #hex)')
  userEvent.type(color1, '{backspace}')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('color', '', true))

  // Error message
  rerender(<Watermark {...props} color={{ data: '', error: true }} />)
  screen.getByText('Input color.')
})

test('fontSize field update', async () => {
  const props = createProps()

  // Normal update
  const { rerender } = render(<Watermark {...props} fontSize={{ data: '3', error: false }} />)
  const fs0 = screen.getByLabelText('Font size (default 64px)')
  userEvent.type(fs0, '%')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('fontSize', '3%', false))

  // Validation error (empty)
  rerender(<Watermark {...props} fontSize={{ data: '3', error: false }} />)
  const fs1 = screen.getByLabelText('Font size (default 64px)')
  userEvent.type(fs1, '{backspace}')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('fontSize', '', true))
  // Validation error (invalid unit)
  rerender(<Watermark {...props} offset={{ data: '3', error: false }} />)
  const os2 = screen.getByLabelText('Offset from screen edge')
  userEvent.type(os2, 'a')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('offset', '3a', true))

  // Error message
  rerender(<Watermark {...props} fontSize={{ data: '', error: true }} />)
  screen.getByText('px, pt, em, rem or %.')
})

test('offset field update', async () => {
  const props = createProps()

  // Normal update
  const { rerender } = render(<Watermark {...props} offset={{ data: '3', error: false }} />)
  const os0 = screen.getByLabelText('Offset from screen edge')
  userEvent.type(os0, '%')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('offset', '3%', false))

  // Validation error (empty)
  rerender(<Watermark {...props} offset={{ data: '3', error: false }} />)
  const os1 = screen.getByLabelText('Offset from screen edge')
  userEvent.type(os1, '{backspace}')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('offset', '', true))
  // Validation error (invalid unit)
  rerender(<Watermark {...props} offset={{ data: '3', error: false }} />)
  const os2 = screen.getByLabelText('Offset from screen edge')
  userEvent.type(os2, 'a')
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('offset', '3a', true))

  // Error message
  rerender(<Watermark {...props} offset={{ data: '', error: true }} />)
  screen.getByText('px, pt, em, rem or %.')
})

test('Position selector', async () => {
  const props = createProps()

  render(<Watermark {...props} position={{ data: 'bottom-right', error: false }} />)
  const p0 = await waitFor(() => screen.getByRole('button', { name: /bottom-right/ }))
  userEvent.click(p0)
  const listbox = within(screen.getByRole('listbox'))
  const items = listbox.getAllByText(/(top|bottom)-(left|right)/)

  expect(items[0].textContent).toBe('top-left')
  expect(items[1].textContent).toBe('top-right')
  expect(items[2].textContent).toBe('bottom-left')
  expect(items[3].textContent).toBe('bottom-right')
  // TODO Select an item
})

test('noComments update', async () => {
  const props = createProps()

  const { rerender } = render(<Watermark {...props} />)
  const noComments0 = screen.getByLabelText('No comments mode')
  userEvent.click(noComments0)
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('noComments', 'true', false))

  rerender(<Watermark {...props} noComments={{ data: true, error: false }} />)
  const noComments1 = screen.getByLabelText('No comments mode')
  userEvent.click(noComments1)
  await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith('noComments', 'false', false))
})