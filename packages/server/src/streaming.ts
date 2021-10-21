import { createServer, IncomingMessage, ServerResponse } from 'http'
import { createWebSocketServer } from './websocket'
import { Configuration, loadConfigAsync } from './Configuration'
import {
  assertNotNullable,
  getLogger,
  setDefaultLogLevel,
  LogLevels,
} from 'common'
import 'tslib'
import { HealthCheck } from './HealthCheck'
import { parseArgv } from './argv'

(async function(): Promise<void> {
  const argv = parseArgv()
  setDefaultLogLevel(argv.loglevel)
  const config = await loadConfigAsync(argv.configPath, 0)
  assertNotNullable(config.content, 'config must be object.')
  const configuration = new Configuration(argv, config.content, config.stat.mtimeMs)
  const log = getLogger('streaming')
  if (log.enabledFor(LogLevels.DEBUG)) {
    log.debug('Configuration', JSON.stringify(configuration))
  }

  const server = createServer((_: IncomingMessage, res: ServerResponse): void => {
    res.end('Hello.')
  })
  const healthCheck = new HealthCheck()
  const wss = createWebSocketServer(server, healthCheck, configuration)
  wss.on('healthcheck', function(): void {
    configuration.reloadIfUpdatedAsync()
  })
  server.listen(configuration.port)

})()
