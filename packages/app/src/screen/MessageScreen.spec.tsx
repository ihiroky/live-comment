import { MessageScreen, createMessageSource } from './MessageScreen'
import { render } from '@testing-library/react'
import { jest, test, expect } from '@jest/globals'
import { ComponentProps } from 'react'
import { Message } from '@/common/Message'

test('Message source subscription', () => {
  const messageSource = {
    subscribe: jest.fn<ComponentProps<typeof MessageScreen>['messageSource']['subscribe']>(),
    unsubscribe: jest.fn<ComponentProps<typeof MessageScreen>['messageSource']['unsubscribe']>(),
  }
  const sut =
    <MessageScreen duration={7000} color={'black'} fontBorderColor={'white'} messageSource={messageSource} />
  const { rerender, unmount } = render(sut)
  rerender(sut)
  expect(messageSource.subscribe).toBeCalledWith(expect.any(Function))

  unmount()
  expect(messageSource.unsubscribe).toBeCalledWith(expect.any(Function))
})

test('Subscribe and unsubscribe message source', () => {
  const sut = createMessageSource()
  const listener = jest.fn<(m: Message) => void>()

  sut.subscribe(listener)
  const m: Message = {
    type: 'comment'
  }
  sut.publish(m)
  expect(listener).toBeCalledWith(m)

  sut.unsubscribe(listener)
  sut.publish(m)
  expect(listener).toBeCalledTimes(1)
})
