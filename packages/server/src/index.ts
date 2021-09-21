import { createServer } from 'http'
import { createWebSocketServer } from './websocket'
import { Configuration } from './Configuration'
import {
  getLogger,
  LogLevels
} from 'common'
import 'tslib'
import { HealthCheck } from './HealthCheck'
import { parseArgv } from './argv'

const argv = parseArgv()
const configuration = new Configuration(argv)
const log = getLogger('index')
log.setLevel(configuration.logLevel)
if (log.enabledFor(LogLevels.DEBUG)) {
  log.debug('Configuration', JSON.stringify(configuration))
}

const server = createServer().on('request', (_, res): void => {
  res.end('Hello.')
})
const healthCheck = new HealthCheck()
const wss = createWebSocketServer(server, healthCheck, configuration)
wss.on('healthcheck', function(): void {
  configuration.reloadIfUpdatedAsync()
})
server.listen(configuration.port)
