const Errors = [
  'ACN_FAILED',
] as const

type Error = typeof Errors[number]

export const CloseCode = {
  ACN_FAILED: 4000
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

export function isCommentMessage(m: any): m is CommentMessage {
  return m.type === 'comment'
}

export function isAcnMessage(m: any): m is AcnMessage {
  return m.type === 'acn'
}

export function isErrorMessage(m: any): m is ErrorMessage {
  return m.type === 'error'
}
