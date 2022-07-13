import { CloseCode } from '@/common/Message'
import { PublishableMessageSource } from '@/screen/MessageScreen'
import { ReconnectableWebSocket } from '@/wscomp/rws'
import { onOpen, onClose } from './screenEventListeners'
import { jest, test, describe, expect } from '@jest/globals'

test('onOpen - Send AcnMessage and publish connected message.', () => {
  const [room, hash] = ['room', 'hash']
  const rws = {
    url: 'someurl',
    send: jest.fn(),
  } as unknown as ReconnectableWebSocket
  const messageSource = {
    publish: jest.fn(),
  } as unknown as PublishableMessageSource

  onOpen(rws, room, hash, messageSource)

  expect(messageSource.publish).toBeCalledWith({
    type: 'comment',
    comment: `🎉 Connected to someurl 🎉`,
  })
  expect(rws.send).toBeCalledWith({
    type: 'acn',
    room,
    hash,
  })
})

describe('onClose', () => {
  test('Send error message if CloseEvent has ACN_FAILED', () => {
    const rws = {
    } as unknown as ReconnectableWebSocket
    const ev = {
      code: CloseCode.ACN_FAILED,
    } as unknown as CloseEvent
    const messageSource = {
      publish: jest.fn(),
    } as unknown as PublishableMessageSource

    onClose(rws, ev, messageSource)

    expect(messageSource.publish).toBeCalledWith({
      type: 'comment',
      comment: 'Room authentication failed. Please check your setting 👀'
    })
  })
  test('Show error message and try to reconnect if CloseEvnet has no ACN_FAILED', () => {
    const rws = {
      url: 'someurl',
      reconnectWithBackoff: jest.fn(),
    } as unknown as ReconnectableWebSocket
    const ev = {
      code: 1006,
    } as unknown as CloseEvent
    const messageSource = {
      publish: jest.fn(),
    } as unknown as PublishableMessageSource

    onClose(rws, ev, messageSource)

    expect(messageSource.publish).toBeCalledWith({
      type: 'comment',
      comment: `Failed to connect to the server (1006) 😢`
    })
    expect(rws.reconnectWithBackoff).toBeCalled()
  })
})