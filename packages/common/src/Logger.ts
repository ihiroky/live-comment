import JsLogger, { ILogger, ILogLevel } from 'js-logger'

type IContext = {
  level: ILogLevel;
  name?: string;
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

JsLogger.useDefaults({
  defaultLevel: JsLogger.INFO,
  formatter: function(messages: any[], context: IContext): void {
    const now = new Date()
    const timestamp = now.getFullYear() + '/' +
      pad0(now.getMonth() + 1) + '/' +
      pad0(now.getDate()) + ' ' +
      pad0(now.getHours()) + ':' +
      pad0(now.getMinutes()) + '.' +
      pad00(now.getMilliseconds())
    messages.unshift(timestamp, `[${context.name}]`, context.level.name.toUpperCase())
  }
})

export function getLogger(scope: string): ILogger {
  return JsLogger.get(scope)
}
