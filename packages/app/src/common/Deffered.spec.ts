import './Deffered'
import { Deffered } from './Deffered'
import { jest, test, expect } from '@jest/globals'

test('Resolve calls resolved', async () => {
  const sut = new Deffered()
  const resolved = jest.fn()
  const rejected = jest.fn()
  sut.promise.then(resolved, rejected)

  sut.resolve(0)
  await sut.promise

  expect(resolved).toBeCalledWith(0)
  expect(rejected).not.toBeCalled()
})

test('Reject calls rejected', async () => {
  const sut = new Deffered()
  const resolved = jest.fn()
  const rejected = jest.fn()
  sut.promise.then(resolved, rejected)

  sut.reject(0)
  let error = null
  try {
    await sut.promise
  } catch (e) {
    error = e
  }

  expect(resolved).not.toBeCalled()
  expect(rejected).toBeCalledWith(0)
  expect(error).not.toBeNull()
})