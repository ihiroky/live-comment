import { sha512 } from 'js-sha512'

export {
  WebSocketClient,
  WebSocketControl,
} from './WebSocketClient'

export {
  CloseCode,
  Message,
  CommentMessage,
  AcnMessage,
  ErrorMessage,
  isCommentMessage,
  isAcnMessage,
  isErrorMessage,
} from './Message'

export function createHash(s: string): string {
  return sha512(s)
}

export { getLogger } from './Logger'
