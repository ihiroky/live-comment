import { getByRole, getByText, queryByRole, render } from '@testing-library/react'
import { renderHook } from '@testing-library/react-hooks'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Choice, useBlinkCountedUpEntries } from './Choice'
import { PollEntry } from './types'
import { assertNotNullable } from '@/common/assert'

let entries: PollEntry[]

beforeEach(() => {
  entries = [
    { key: 0, description: 'desc0', count: 0 },
    { key: 1, description: 'desc1', count: 0 },
    { key: 2, description: 'desc2', count: 0 },
  ]
})

test('Nothing draws on result-graph mode', () => {
  render(<Choice
    entries={entries} mode="result-graph" descClass="desc" topClass="top" onRemoveEntry={() => undefined}
  />)

  expect(document.getElementById('choice-element-0')).toBeNull()
  expect(document.getElementById('choice-element-1')).toBeNull()
  expect(document.getElementById('choice-element-2')).toBeNull()
})

test('Show entries only on poll mode', () => {
  render(<Choice entries={entries} mode="poll" descClass="desc" topClass="top" onRemoveEntry={() => undefined} />)

  const descElements = document.getElementsByClassName('desc')
  entries.forEach((e, i) => {
    const rootElement = document.getElementById('choice-element-' + i)
    assertNotNullable(rootElement, 'choice-element-' + i)
    getByText(rootElement, String(i + 1))

    expect(descElements[i].textContent).toBe(e.description)

    const button = queryByRole(rootElement, 'button', { name: 'Del' })
    expect(button).toBeNull()
  })
})

test('Show entries and delete buttons on edit mode', () => {
  render(<Choice entries={entries} mode="edit" descClass="desc" topClass="top" onRemoveEntry={() => undefined} />)

  const descElements = document.getElementsByClassName('desc')
  entries.forEach((e, i) => {
    const rootElement = document.getElementById('choice-element-' + i)
    assertNotNullable(rootElement, 'choice-element-' + i)
    getByText(rootElement, String(i + 1))

    expect(descElements[i].textContent).toBe(e.description)

    getByRole(rootElement, 'button', { name: 'Del' })
  })
})

test('Click Del button then onRemoveEntry is called', () => {
  const onRemoveEntry = jest.fn()
  render(<Choice entries={entries} mode="edit" descClass="desc" topClass="top" onRemoveEntry={onRemoveEntry} />)

  entries.forEach((e, i) => {
    const rootElement = document.getElementById('choice-element-' + i)
    assertNotNullable(rootElement, 'choice-element-' + i)
    const button = getByRole(rootElement, 'button', { name: 'Del' })
    userEvent.click(button)
    expect(onRemoveEntry).toBeCalledWith(i)
  })
})

test('Show entries and counts on result-list mode', () => {
  const highestCountIndex = 2
  entries[highestCountIndex].count = 10
  render(<Choice
    entries={entries} mode="result-list" descClass="desc" topClass="top" onRemoveEntry={() => undefined}
  />)

  const descElements = document.getElementsByClassName('desc')
  entries.forEach((e, i) => {
    const rootElement = document.getElementById('choice-element-' + i)
    assertNotNullable(rootElement, 'choice-element-' + i)

    // Index label
    getByText(rootElement, String(i + 1))

    // 'top' class
    const topElements = rootElement.getElementsByClassName('top')
    if (i === highestCountIndex) {
      expect(topElements.length).toBe(1)
    } else {
      expect(topElements.length).toBe(0)
    }

    // Description and count
    expect(descElements[i * 2].textContent).toBe(e.description)
    expect(descElements[i * 2 + 1].textContent).toBe(String(e.count))

    // No delete button
    const button = queryByRole(rootElement, 'button', { name: 'Del' })
    expect(button).toBeNull()
  })
})

describe('blink', () => {
  function wait(ms: number): Promise<void> {
    return new Promise<void>((resolve: () => void): void => {
      setTimeout(resolve, ms)
    })
  }

  let elements: HTMLElement[]

  beforeEach(() => {
    elements = entries.map(e => {
      const div = document.createElement('div')
      div.id = 'choice-element-' + e.key
      return div
    })
    elements.forEach(e => document.body.appendChild(e))
  })

  afterEach(() => {
    elements.forEach(e => {
      document.body.removeChild(e)
    })
  })

  test('Count up entriy blinks', async () => {

    const requestAnimationFrameSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      setTimeout(() => cb(0), 0)
      return 0
    })
    const props: { entries: PollEntry[], blinkClass: string} = {
      entries,
      blinkClass: 'blink',
    }

    // requestAnimationFrame is not called entries increase.
    const { rerender, waitFor } = renderHook(
      (props) => useBlinkCountedUpEntries(props.entries, props.blinkClass),
      {
        initialProps: props
      }
    )
    await wait(10)
    expect(requestAnimationFrameSpy).not.toBeCalled()

    // requestAnmationFrame is not called if all entry count is zero.
    props.entries = [...props.entries]
    rerender(props)
    await wait(10)
    expect(requestAnimationFrameSpy).not.toBeCalled()

    // Count up, then its entry has blinkClass.
    props.entries = [...props.entries]
    props.entries[1].count = 10
    props.entries[2].count = 5
    rerender(props)
    expect(elements[0].className).not.toContain(props.blinkClass)
    expect(elements[1].className).not.toContain(props.blinkClass)
    expect(elements[2].className).not.toContain(props.blinkClass)
    await waitFor(() => {
      expect(elements[0].className).not.toContain(props.blinkClass)
      expect(elements[1].className).toContain(props.blinkClass)
      expect(elements[2].className).toContain(props.blinkClass)
    })

    // Countup again
    props.entries = [...props.entries]
    props.entries[2].count = 6
    rerender(props)
    expect(elements[0].className).not.toContain(props.blinkClass)
    expect(elements[1].className).toContain(props.blinkClass) // Remained
    expect(elements[2].className).not.toContain(props.blinkClass) // Refreshed
    await waitFor(() => {
      expect(elements[0].className).not.toContain(props.blinkClass)
      expect(elements[1].className).toContain(props.blinkClass)
      expect(elements[2].className).toContain(props.blinkClass)
    })
  })
})
