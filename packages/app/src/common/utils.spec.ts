import { isObject } from './utils'
import { test, expect } from '@jest/globals'

test('null is not "Object"', () => {
  const actual = isObject(null)

  expect(actual).toBeFalsy()
})

test('{} is "Object"', () => {
  const actual = isObject({})

  expect(actual).toBeTruthy()
})

test('1 is not "Object"', () => {
  const actual = isObject(1)

  expect(actual).toBeFalsy()
})
