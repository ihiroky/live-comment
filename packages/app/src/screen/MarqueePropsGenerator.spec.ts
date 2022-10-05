import { ApplicationMessage, CommentMessage } from '@/common/Message'
import { createRef, RefObject } from 'react'
import {
  MarqueePropsGenerator,
  MarqueeProps,
  calcMinimumEmptyLevel,
  findLevelRightSpaceExists,
} from './MarqueePropsGenerator'
import { jest, test, expect, beforeEach, afterEach, describe } from '@jest/globals'

const SPACE_BETWEEN_COMMENTS = 384

function matchMarqueePropsExceptKey(actual: MarqueeProps, expected: Omit<MarqueeProps, 'key'>) {
  expect(actual.created).toBe(expected.created)
  expect(actual.level).toBe(expected.level)
  expect(actual.ref.current).toEqual(expected.ref.current)
  expect(actual.comment).toBe(expected.comment)
}

describe('calcMinimumEmptyLevel', () => {
  test('Return zero if no marquee exists', () => {
    const actual = calcMinimumEmptyLevel([])

    expect(actual).toBe(0)
  })

  test('Return zero if first entry level is more than zero', () => {
    const marquees: MarqueeProps[] = [
      { key: 0, created: 0, level: 1, comment: 'comment0', ref: createRef<HTMLParagraphElement>() },
      { key: 1, created: 1, level: 2, comment: 'comment0', ref: createRef<HTMLParagraphElement>() },
    ]

    const actual = calcMinimumEmptyLevel(marquees)

    expect(actual).toBe(0)
  })

  test('Return first emtpy level', () => {
    const marquees: MarqueeProps[] = [
      { key: 0, created: 1, level: 0, comment: 'comment0', ref: createRef<HTMLParagraphElement>() },
      { key: 1, created: 2, level: 1, comment: 'comment1', ref: createRef<HTMLParagraphElement>() },
      { key: 2, created: 3, level: 3, comment: 'comment2', ref: createRef<HTMLParagraphElement>() },
    ]

    const actual = calcMinimumEmptyLevel(marquees)

    expect(actual).toBe(2)
  })

  test('Return first empty level (the smae level exists)', () => {
    const marquees: MarqueeProps[] = [
      { key: 0, created: 0, level: 0, comment: 'comment0', ref: createRef<HTMLParagraphElement>() },
      { key: 1, created: 1, level: 1, comment: 'comment1', ref: createRef<HTMLParagraphElement>() },
      { key: 2, created: 2, level: 1, comment: 'comment2', ref: createRef<HTMLParagraphElement>() },
      { key: 2, created: 3, level: 3, comment: 'comment2', ref: createRef<HTMLParagraphElement>() },
    ]

    const actual = calcMinimumEmptyLevel(marquees)

    expect(actual).toBe(2)
  })

  test('Return -1 if no empty level in the list', () => {
    const marquees: MarqueeProps[] = [
      { key: 0, created: 0, level: 0, comment: 'comment0', ref: createRef<HTMLParagraphElement>() },
      { key: 1, created: 1, level: 1, comment: 'comment1', ref: createRef<HTMLParagraphElement>() },
      { key: 2, created: 2, level: 2, comment: 'comment2', ref: createRef<HTMLParagraphElement>() },
    ]

    const actual = calcMinimumEmptyLevel(marquees)

    expect(actual).toBe(-1)
  })
})

describe('findLevelRightSpaceExists', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).innerWidth = 1600
  })

  test('Return 0 if marquees is empty', () => {
    const actual = findLevelRightSpaceExists([])

    expect(actual).toBe(0)
  })

  test('Return 0 if the first element level of marquees is more than 0', () => {
    const marquees: MarqueeProps[] = [
      { key: 0, created: 0, level: 1, comment: 'comment0', ref: createRef<HTMLParagraphElement>() },
    ]

    const actual = findLevelRightSpaceExists(marquees)

    expect(actual).toBe(0)
  })

  test('Return level zero which right has enouch space at zero', () => {
    // Level 0 only (last level)
    const marquees = [
      window.innerWidth - 1000,
      window.innerWidth - (SPACE_BETWEEN_COMMENTS + 1)
    ].map((right, i): MarqueeProps => {
      const p = {
        getBoundingClientRect: () => {
          return { right }
        }
      } as HTMLParagraphElement
      const ref = { current: p } as RefObject<HTMLParagraphElement>
      return {
        key: i,
        created: 0,
        level: 0,
        comment: 'comment' + i,
        ref,
      }
    })

    const actual = findLevelRightSpaceExists(marquees)

    expect(actual).toBe(0)
  })

  test('Return the minimum level which right has enouch space', () => {
    const marquees = [{
      // Level 0 (enough space)
      key: 0,
      created: 0,
      level: 0,
      comment: 'comment0',
      ref: {
        current: {
          getBoundingClientRect: () => { return { right: window.innerWidth - (SPACE_BETWEEN_COMMENTS + 1) } },
        } as HTMLParagraphElement
      }
    }, {
      // Level 1 (enough space)
      key: 1,
      created: 1,
      level: 1,
      comment: 'comment10',
      ref: {
        current: {
          getBoundingClientRect: () => { return { right: 0 } },
        } as HTMLParagraphElement
      }
    }]

    const actual = findLevelRightSpaceExists(marquees)

    expect(actual).toBe(0)
  })

  test('Return the first level which has enough right space', () => {
    const marquees = [{
      // Level 0 (no space)
      key: 0,
      created: 0,
      level: 0,
      comment: 'comment0',
      ref: {
        current: {
          getBoundingClientRect: () => { return { right: window.innerWidth - SPACE_BETWEEN_COMMENTS } },
        } as HTMLParagraphElement
      }
    }, {
      // Level 1 (enough space)
      key: 1,
      created: 1,
      level: 1,
      comment: 'comment1',
      ref: {
        current: {
          getBoundingClientRect: () => { return { right: window.innerWidth - (SPACE_BETWEEN_COMMENTS + 1) } },
        } as HTMLParagraphElement
      }
    }, {
      // Level 2 (enough space)
      key: 2,
      created: 2,
      level: 2,
      comment: 'comment2',
      ref: {
        current: {
          getBoundingClientRect: () => { return { right: window.innerWidth - (SPACE_BETWEEN_COMMENTS + 1) } },
        } as HTMLParagraphElement
      }
    }]

    const actual = findLevelRightSpaceExists(marquees)

    expect(actual).toBe(1)
  })

  test('Return -1 there is no right space', () => {
    const marquees = [{
      // Level 0 (no space)
      key: 0,
      created: 0,
      level: 0,
      comment: 'comment0',
      ref: {
        current: {
          getBoundingClientRect: () => { return { right: window.innerWidth - SPACE_BETWEEN_COMMENTS } },
        } as HTMLParagraphElement
      }
    }, {
      // Level 1 (no space)
      key: 1,
      created: 1,
      level: 1,
      comment: 'comment1',
      ref: {
        current: {
          getBoundingClientRect: () => { return { right: window.innerWidth - SPACE_BETWEEN_COMMENTS } },
        } as HTMLParagraphElement
      }
    }]

    const actual = findLevelRightSpaceExists(marquees)

    expect(actual).toBe(-1)
  })

  test('There is no right spance if a marquee is not rendered yet', () => {
    const marquees = [{
      // Level 0 (not rendered (no space))
      key: 0,
      created: 0,
      level: 0,
      comment: 'comment0',
      ref: {
        current: null
      }
    }, {
      // Level 1 (enough space)
      key: 1,
      created: 1,
      level: 1,
      comment: 'comment1',
      ref: {
        current: {
          getBoundingClientRect: () => { return { right: window.innerWidth - (SPACE_BETWEEN_COMMENTS + 1) } },
        } as HTMLParagraphElement
      }
    }]

    const actual = findLevelRightSpaceExists(marquees)

    expect(actual).toBe(1)
  })
})

describe('MarqueePropsGenerator', () => {
  let nowOriginal: () => number

  beforeEach(() => {
    nowOriginal = Date.now
    Date.now = () => 123
  })

  afterEach(() => {
    Date.now = nowOriginal
  })

  describe('onMessage', () => {

    test('Drop message except CommentMessage', () => {
      const onUpdate = jest.fn()
      const sut = new MarqueePropsGenerator(7, onUpdate)

      const app: ApplicationMessage = {
        type: 'app',
        cmd: 'cmd'
      }
      sut.onMessage(app)

      expect(onUpdate).not.toBeCalled()
    })

    test('Drop message if too many marqueeing messages exists', () => {
      const onUpdate = jest.fn()
      const duration = 7000
      const sut = new MarqueePropsGenerator(duration, onUpdate)

      for (let i = 0; i < 500; i++) {
        const created = Date.now() + duration + 1
        sut['marquees'].push(
          { key: i, created, level: i, comment: 'comment' + i, ref: { current: null } }
        )
      }
      const message: CommentMessage = {
        type: 'comment',
        comment: 'new comment',
      }
      sut.onMessage(message)

      expect(onUpdate).not.toBeCalled()
    })

    test('Drop out-of-date message', () => {
      const onUpdate = jest.fn()
      const duration = 7000
      const sut = new MarqueePropsGenerator(duration, onUpdate)

      const m0: MarqueeProps = {
        key: 0, created: Date.now() - (duration + 1), level: 0, comment: 'comment 0', ref: { current: null }
      }
      const m1: MarqueeProps = {
        key: 1, created: Date.now() - (duration + 0), level: 0, comment: 'comment 1', ref: { current: null }
      }
      sut['marquees'].push(m0)
      sut['marquees'].push(m1)
      const message: CommentMessage = {
        type: 'comment',
        comment: 'new comment',
      }
      sut.onMessage(message)

      const actual = sut['marquees']
      expect(actual.length).toBe(2)
      matchMarqueePropsExceptKey(actual[0], m1)
      matchMarqueePropsExceptKey(actual[1], {
        created: 123,
        level: 1,
        ref: { current: null },
        comment: message.comment,
      })
    })

    test('Minimum empty level exists', () => {
      const onUpdate = jest.fn()
      const sut = new MarqueePropsGenerator(7000, onUpdate)

      const message: CommentMessage = {
        type: 'comment',
        comment: 'comment 0',
      }
      sut.onMessage(message)

      const actual = onUpdate.mock.calls[0][0] as MarqueeProps[]
      expect(actual.length).toBe(1)
      matchMarqueePropsExceptKey(actual[0], {
        created: Date.now(),
        level: 0,
        comment: 'comment 0',
        ref: { current: null }
      })
    })

    test('No minimum empty level and enough right space exists', () => {
      const onUpdate = jest.fn()
      const sut = new MarqueePropsGenerator(7000, onUpdate)

      const p0 = {
        getBoundingClientRect: () => ({ right: window.innerWidth - SPACE_BETWEEN_COMMENTS })
      } as HTMLParagraphElement
      const m0 = {
        key: 0,
        created: 0,
        level: 0,
        ref: { current: p0 },
        comment: 'comment 0'
      }
      sut['marquees'].push(m0)
      const p1 = {
        getBoundingClientRect: () => ({ right: window.innerWidth - (SPACE_BETWEEN_COMMENTS + 1) })
      } as HTMLParagraphElement
      const m1 = {
        key: 1,
        created: 1,
        level: 1,
        ref: { current: p1 },
        comment: 'comment 1'
      }
      sut['marquees'].push(m1)
      const message: CommentMessage = {
        type: 'comment',
        comment: 'comment 2',
      }
      sut.onMessage(message)

      const actual = sut['marquees']
      expect(actual.length).toBe(3)
      matchMarqueePropsExceptKey(actual[0], m0)
      matchMarqueePropsExceptKey(actual[1], m1)
      matchMarqueePropsExceptKey(actual[2], {
        created: 123,
        level: m1.level,
        ref: { current: null },
        comment: message.comment,
      })
    })

    test('No minimum empty level and no enough right space exists', () => {
      const onUpdate = jest.fn()
      const sut = new MarqueePropsGenerator(7000, onUpdate)

      const p0 = {
        getBoundingClientRect: () => ({ right: window.innerWidth - SPACE_BETWEEN_COMMENTS })
      } as HTMLParagraphElement
      const m0 = {
        key: 0,
        created: 0,
        level: 0,
        ref: { current: p0 },
        comment: 'comment 0'
      }
      sut['marquees'].push(m0)
      const message: CommentMessage = {
        type: 'comment',
        comment: 'comment 1',
      }
      sut.onMessage(message)

      const actual = sut['marquees']
      expect(actual.length).toBe(2)
      matchMarqueePropsExceptKey(actual[0], m0)
      matchMarqueePropsExceptKey(actual[1], {
        created: 123,
        level: m0.level + 1,
        ref: { current: null },
        comment: message.comment,
      })
    })

    test('Insert middle of the marquees', () => {
      const onUpdate = jest.fn()
      const sut = new MarqueePropsGenerator(7000, onUpdate)

      // No level 1 marquees
      const p0 = {
        getBoundingClientRect: () => ({ right: window.innerWidth - SPACE_BETWEEN_COMMENTS })
      } as HTMLParagraphElement
      const m0 = {
        key: 0,
        created: 0,
        level: 0,
        ref: { current: p0 },
        comment: 'comment 0'
      }
      sut['marquees'].push(m0)
      const p1 = {
        getBoundingClientRect: () => ({ right: window.innerWidth - SPACE_BETWEEN_COMMENTS })
      } as HTMLParagraphElement
      const m1 = {
        key: 1,
        created: 1,
        level: 2,
        ref: { current: p1 },
        comment: 'comment 1'
      }
      sut['marquees'].push(m1)
      const message: CommentMessage = {
        type: 'comment',
        comment: 'comment 2',
      }
      sut.onMessage(message)

      const actual = sut['marquees']
      expect(actual.length).toBe(3)
      matchMarqueePropsExceptKey(actual[0], m0)
      matchMarqueePropsExceptKey(actual[1], {
        created: 123,
        level: 1,
        ref: { current: null },
        comment: message.comment,
      })
      matchMarqueePropsExceptKey(actual[2], m1)
    })
  })

  test('If the new message level is lower than the current minimum level, insert new one at head', () => {
    const onUpdate = jest.fn()
    const sut = new MarqueePropsGenerator(7000, onUpdate)

    const p0 = {
      getBoundingClientRect: () => ({ right: window.innerWidth - SPACE_BETWEEN_COMMENTS })
    } as HTMLParagraphElement
    const m0 = {
      key: 0,
      created: 0,
      level: 1,
      ref: { current: p0 },
      comment: 'comment 0'
    }
    sut['marquees'].push(m0)
    const message0: CommentMessage = {
      type: 'comment',
      comment: 'comment 0',
    }
    sut.onMessage(message0)
    const message1: CommentMessage = {
      type: 'comment',
      comment: 'comment 1',
    }
    sut.onMessage(message1)

    const actual = sut['marquees']
    expect(actual.length).toBe(3)
    matchMarqueePropsExceptKey(actual[0], {
      created: 123,
      level: 0,
      ref: { current: null },
      comment: message0.comment,
    })
    matchMarqueePropsExceptKey(actual[1], m0)
    matchMarqueePropsExceptKey(actual[2], {
      created: 123,
      level: 2,
      ref: { current: null },
      comment: message1.comment,
    })
  })
})
