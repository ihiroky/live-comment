import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { LabeledCheckbox } from './LabeledCheckbox'
import { jest, test } from '@jest/globals'

test('Label, name, and checked', () => {
  render(<LabeledCheckbox label="LABEL" name="NAME" checked onChange={() => undefined} />)

  screen.getByText('LABEL')
  const checkBox = screen.getByRole('checkbox', { name: 'LABEL' }) as HTMLInputElement

  expect(checkBox).toBeChecked()
  expect(checkBox.name).toBe('NAME')
})

test('Uncheck checkbox', () => {
  const onChange = jest.fn()
  render(<LabeledCheckbox label="LABEL" name="NAME" checked onChange={onChange} />)

  const checkBox = screen.getByRole('checkbox', { name: 'LABEL' })
  expect(checkBox).toBeChecked()
  userEvent.click(checkBox)
  expect(onChange).toBeCalledWith(false)
})

test('Check checkobx', () => {
  const onChange = jest.fn()
  render(<LabeledCheckbox label="LABEL" name="NAME" checked={false} onChange={onChange} />)

  const checkBox = screen.getByRole('checkbox', { name: 'LABEL' })
  expect(checkBox).not.toBeChecked()
  const label = screen.getByText('LABEL')
  userEvent.click(label)
  expect(onChange).toBeCalledWith(true)
})
