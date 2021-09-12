import { sha512 } from 'js-sha512'

export {
  CloseCode,
  Message,
  CommentMessage,
  AcnMessage,
  AcnOkMessage,
  ApplicationMessage,
  ErrorMessage,
  isCommentMessage,
  isClientMessage,
  isAcnMessage,
  isErrorMessage,
  isApplicationMessage,
} from './Message'

export function createHash(s: string): string {
  return sha512(s)
}

export { isObject } from './isObject'
export { assertNotNullable } from './assert'
export { Deffered } from './Deffered'

export {
  getLogger,
  LogLevel,
  LogLevels,
  parseLogLevel
} from './Logger'
