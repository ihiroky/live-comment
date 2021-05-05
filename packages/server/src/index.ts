import { createServer } from 'http'
import { createWebSocketServer } from './websocket'
import { Configuration } from './Configuration'
import {
  getLogger,
  LogLevels
} from 'common'
import 'tslib'

const configuration = new Configuration()
const log = getLogger('index')
log.setLevel(configuration.logLevel)
if (log.enabledFor(LogLevels.DEBUG)) {
  log.debug('Configuration', JSON.stringify(configuration))
}

const server = createServer().on('request', (_, res): void => {
  res.end('Hello.')
})
const wss = createWebSocketServer(server, configuration)
log.debug('wss', wss)
server.listen(configuration.port)
