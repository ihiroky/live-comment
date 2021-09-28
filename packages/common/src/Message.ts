import { isObject } from './utils'

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
  type: 'comment' | 'acn' | 'error' | 'app'
  from?: string
  to?: string
}

export interface CommentMessage extends Message {
  type: 'comment'
  comment: string
  pinned?: boolean
}

export interface AcnMessage extends Message {
  type: 'acn'
  room: string
  hash: string
}

export interface AcnOkMessage extends Message {
  type: 'acn'
  attrs: {
    sessionId: string
  }
}

export interface ErrorMessage extends Message {
  type: 'error'
  error: Error
  message: string
}

export interface ApplicationMessage extends Message {
  type: 'app'
  cmd: string
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
  return m.type === 'acn' && typeof m.room === 'string' && typeof m.hash === 'string'
}

export function isAcnOkMessage(m: unknown): m is AcnOkMessage {
  if (!isObject(m)) {
    return false
  }
  return m.type === 'acn' && typeof m.sessionId === 'string'
}

export function isErrorMessage(m: unknown): m is ErrorMessage {
  if (!isObject(m)) {
    return false
  }
  return m.type === 'error'
}

export function isApplicationMessage(m: unknown): m is ApplicationMessage {
  if (!isObject(m)) {
    return false
  }
  return m.type === 'app'
}

export function isClientMessage(m: unknown): m is CommentMessage | ApplicationMessage {
  if (!isObject(m)) {
    return false
  }
  return m.type === 'comment' || m.type === 'app'
}