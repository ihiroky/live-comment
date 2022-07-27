import { MarqueeList } from './MarqueeList'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MarqueeProps } from './MarqueePropsGenerator'
import { createRef } from 'react'
import { test, expect } from '@jest/globals'

test('Draw', () => {
  const marquees: MarqueeProps[] = [
    { key: 0, created: 0, level: 0, comment: 'comment0', ref: createRef<HTMLParagraphElement>() },
    { key: 1, created: 1, level: 1, comment: 'comment1', ref: createRef<HTMLParagraphElement>() },
    { key: 2, created: 2, level: 2, comment: 'comment2', ref: createRef<HTMLParagraphElement>() },
  ]
  render(<MarqueeList marquees={marquees} marqueeHeight={64} duration={7000} color="white" fontBorderColor="black" />)

  marquees.forEach(m => {
    const p = screen.getByText(m.comment)
    expect(p.className).toBe('message')
    expect(p).toBe(m.ref.current)
    expect(p.style.top).toBe(`${64 * m.level + 64 / 2}px`)
    expect(p.style.animationDuration).toBe('7000ms')
    expect(p.style.color).toBe('white')
    // jsdom do not accept webkitTextStorke ?
    // expect(p.style.webkitTextStroke).toBe('1px black')
  })
})
