import { AcnTokenMessage, isAcnOkMessage, isAcnTokenMessage } from '.'
import {
  AcnMessage,
  AcnOkMessage,
  ApplicationMessage,
  CommentMessage,
  ErrorMessage,
  isAcnMessage,
  isApplicationMessage,
  isClientMessage,
  isCommentMessage,
  isErrorMessage,
} from './Message'

test('isAcnMessage', () => {
  const msg: AcnMessage = {
    type: 'acn',
    room: 'room',
    hash: 'hash',
  }

  expect(isAcnMessage(msg)).toBeTruthy()
})

test('isAcnMessage no acn', () => {
  const msg: CommentMessage = {
    type: 'comment',
    comment: 'comment'
  }

  expect(isAcnMessage(msg)).toBeFalsy()
})

test('isAcnMessage null', () => {
  expect(isAcnMessage(null)).toBeFalsy()
})

test('isAcnOkMessage', () => {
  const msg: AcnOkMessage = {
    type: 'acn',
    attrs: {
      token: 'token',
    },
  }

  expect(isAcnOkMessage(msg)).toBe(true)
})

test('isAcnOkMessage no acnok', () => {
  const msg: AcnMessage = {
    type: 'acn',
    room: 'room',
    hash: 'hash',
  }

  expect(isAcnOkMessage(msg)).toBe(false)
})

test('isAcnTokenMessage', () => {
  const msg: AcnTokenMessage = {
    type: 'acn',
    token: 'aaa'
  }

  expect(isAcnTokenMessage(msg)).toBe(true)
})

test('isAcnTokenMessage false', () => {
  const msg: AcnMessage = {
    type: 'acn',
    room: 'room',
    hash: 'hash',
  }

  expect(isAcnTokenMessage(msg)).toBe(false)
})

test('isApplicationMessage', () => {
  const msg: ApplicationMessage = {
    type: 'app',
    cmd: 'cmd'
  }

  expect(isApplicationMessage(msg)).toBeTruthy()
})

test('isApplicationMessage no acn', () => {
  const msg: CommentMessage = {
    type: 'comment',
    comment: 'comment'
  }

  expect(isApplicationMessage(msg)).toBeFalsy()
})

test('isApplicationMessage null', () => {
  expect(isApplicationMessage(null)).toBeFalsy()
})

test('isClientMessage comment', () => {
  const msg: CommentMessage = {
    type: 'comment',
    comment: 'comment'
  }

  expect(isClientMessage(msg)).toBeTruthy()
})

test('isClientMessage app', () => {
  const msg: ApplicationMessage = {
    type: 'app',
    cmd: 'cmd',
  }

  expect(isClientMessage(msg)).toBeTruthy()
})

test('isClientMessage no comment/app', () => {
  const msg: AcnMessage = {
    type: 'acn',
    room: 'room',
    hash: 'hash',
  }

  expect(isClientMessage(msg)).toBeFalsy()
})

test('isClientMessage null', () => {
  expect(isClientMessage(null)).toBeFalsy()
})

test('isCommentMessage', () => {
  const msg: CommentMessage = {
    type: 'comment',
    comment: 'comment'
  }

  expect(isCommentMessage(msg)).toBeTruthy()
})

test('isCommentMessage no comment', () => {
  const msg: AcnMessage = {
    type: 'acn',
    room: 'room',
    hash: 'hash',
  }

  expect(isCommentMessage(msg)).toBeFalsy()
})

test('isCommentMessage null', () => {
  expect(isCommentMessage(null)).toBeFalsy()
})

test('isErrorMessage', () => {
  const msg: ErrorMessage = {
    type: 'error',
    error: 'ACN_FAILED',
    message: 'message',
  }

  expect(isErrorMessage(msg)).toBeTruthy()
})

test('isCommentMessage no error', () => {
  const msg: AcnMessage = {
    type: 'acn',
    room: 'room',
    hash: 'hash',
  }

  expect(isErrorMessage(msg)).toBeFalsy()
})

test('isErrorMessage null', () => {
  expect(isErrorMessage(null)).toBeFalsy()
})
