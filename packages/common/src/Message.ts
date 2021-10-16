import { isObject } from './utils'

const Errors = [
  'ACN_FAILED',
  'TOO_MANY_PENDING_MESSAGES',
] as const

type Error = typeof Errors[number]

export const CloseCode = {
  ACN_FAILED: 4000,
  TOO_MANY_PENDING_MESSAGES: 4001,
  INVALID_MESSAGE: 4002,
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
  longLife?: boolean
}

export interface AcnTokenMessage extends Message {
  type: 'acn'
  token: string
}

export interface AcnOkMessage extends Message {
  type: 'acn'
  attrs: {
    token: string
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
  return isObject(m) && m.type === 'comment'
}

export function isAcnMessage(m: unknown): m is AcnMessage {
  return isObject(m) && m.type === 'acn' && typeof m.room === 'string' && typeof m.hash === 'string'
}

export function isAcnTokenMessage(m: unknown): m is AcnTokenMessage {
  return isObject(m) && m.type === 'acn' && typeof m.token === 'string'
}

export function isAcnOkMessage(m: unknown): m is AcnOkMessage {
  return isObject(m) &&
    m.type === 'acn' &&
    isObject(m.attrs) &&
    typeof m.attrs.token === 'string'
}

export function isErrorMessage(m: unknown): m is ErrorMessage {
  return isObject(m) && m.type === 'error'
}

export function isApplicationMessage(m: unknown): m is ApplicationMessage {
  return isObject(m) && m.type === 'app'
}

export function isClientMessage(m: unknown): m is CommentMessage | ApplicationMessage {
  return isObject(m) && (m.type === 'comment' || m.type === 'app')
}
