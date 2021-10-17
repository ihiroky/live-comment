import { sha512 } from 'js-sha512'

export * from './Message'

export function createHash(s: string): string {
  return sha512(s)
}

export * from './utils'
export { assertNotNullable } from './assert'
export { Deffered } from './Deffered'

export {
  getLogger,
  LogLevel,
  LogLevels,
  parseLogLevel
} from './Logger'
