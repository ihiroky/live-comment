import { assertNotNullable } from './assert'

test('Throw error if value is undefined.', () => {
  expect(() => assertNotNullable(undefined, 'hoge'))
    .toThrowError('Expected value (hoge) not to be nullable, actually undefined.')
})

test('Throw error if value is null.', () => {
  expect(() => assertNotNullable(null, 'fuga'))
    .toThrowError('Expected value (fuga) not to be nullable, actually null.')
})

test('Do not throw error if value is 0.', () => {
  expect(() => assertNotNullable(0, 'foo'))
    .not.toThrow()
})
