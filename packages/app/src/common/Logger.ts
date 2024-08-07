import JsLogger, { ILogLevel } from 'js-logger'

type IContext = {
  level: ILogLevel
  name?: string
}

function pad0(n: number): string {
  return (n < 10) ? '0' + n : String(n)
}

function pad00(n: number): string {
  return (n < 10)
    ? '00' + n
    : (n < 100)
      ? '0' + n
      : String(n)
}

// This is not a react hooks
// eslint-disable-next-line react-hooks/rules-of-hooks
JsLogger.useDefaults({
  defaultLevel: JsLogger.INFO,
  formatter: function(messages: unknown[], context: IContext): void {
    const now = new Date()
    const timestamp = now.getFullYear() + '/' +
      pad0(now.getMonth() + 1) + '/' +
      pad0(now.getDate()) + ' ' +
      pad0(now.getHours()) + ':' +
      pad0(now.getMinutes()) + ':' +
      pad0(now.getSeconds()) + '.' +
      pad00(now.getMilliseconds())
    messages.unshift(timestamp, `[${context.name}]`, context.level.name.toUpperCase())
  }
})

export type LogLevel = ILogLevel

type Logger = {
  trace(...x: unknown[]): void
  debug(...x: unknown[]): void
  info(...x: unknown[]): void
  log(...x: unknown[]): void
  warn(...x: unknown[]): void
  error(...x: unknown[]): void
  time(label: string): void
  timeEnd(label: string): void
  setLevel(level: LogLevel): void
  getLevel(): LogLevel
  enabledFor(level: LogLevel): boolean
}

export function getLogger(scope: string): Logger {
  return JsLogger.get(scope)
}

export function setDefaultLogLevel(level: LogLevel): void {
  JsLogger.setLevel(level)
}

export const LogLevels = {
  OFF: JsLogger.OFF,
  ERROR: JsLogger.ERROR,
  WARN: JsLogger.WARN,
  INFO: JsLogger.INFO,
  DEBUG: JsLogger.DEBUG,
  TRACE: JsLogger.TRACE
}

export function parseLogLevel(v: unknown): LogLevel {
  if (v === undefined) {
    return JsLogger.INFO
  }
  const s = String(v).toUpperCase()
  switch(s) {
    case 'OFF':   return JsLogger.OFF
    case 'ERROR': return JsLogger.ERROR
    case 'WARN':  return JsLogger.WARN
    case 'INFO':  return JsLogger.INFO
    case 'DEBUG': return JsLogger.DEBUG
    case 'TRACE': return JsLogger.TRACE
    default:      return JsLogger.INFO
  }
}
