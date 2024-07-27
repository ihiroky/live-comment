import { isObject } from './utils'

const Errors = [
  'ACN_FAILED',
  'TOO_MANY_PENDING_MESSAGES',
  'UNEXPECTED_FORMAT',
  'ERROR',
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
  ts?: number
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

export interface AcnRoomsMessage extends Message {
  type: 'acn'
  nid: string
  rooms: {
    room: string
    hash: string
  }[]
}

export interface ErrorMessage extends Message {
  type: 'error'
  error: Error
  message: string
}

export interface ApplicationMessage extends Message {
  type: 'app'
  cmd: string
  ts?: number
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

export function isAcnRoomsMessage(m: unknown): m is AcnRoomsMessage {
  return isObject(m) && m.type === 'acn' && typeof m.nid === 'string' && Array.isArray(m.rooms)
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
