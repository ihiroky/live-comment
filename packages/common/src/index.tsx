import { sha512 } from 'js-sha512'

export { WebSocketClient } from './WebSocketClient'

export {
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