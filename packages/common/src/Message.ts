import { isObject } from './isObject'

const Errors = [
  'ACN_FAILED',
  'TOO_MANY_PENDING_MESSAGES',
] as const

type Error = typeof Errors[number]

export const CloseCode = {
  ACN_FAILED: 4000,
  TOO_MANY_PENDING_MESSAGES: 4001
}

export interface Message {
  type: string
}

export interface CommentMessage extends Message {
  type: 'comment'
  comment: string
}
export interface AcnMessage extends Message {
  type: 'acn'
  room: string
  hash: string
}

export interface ErrorMessage  extends Message {
  type: 'error'
  error: Error
  message: string
}

export function isCommentMessage(m: unknown): m is CommentMessage {
  if (!isObject(m)) {
    return false
  }
  return m.type === 'comment'
}

export function isAcnMessage(m: unknown): m is AcnMessage {
  if (!isObject(m)) {
    return false
  }
  return m.type === 'acn'
}

export function isErrorMessage(m: unknown): m is ErrorMessage {
  if (!isObject(m)) {
    return false
  }
  return m.type === 'error'
}
