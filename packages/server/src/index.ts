import { createServer, IncomingMessage, ServerResponse } from 'http'
import fs from 'fs'
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

const server = createServer((req: IncomingMessage, res: ServerResponse): void => {
  const reqUrl = req.url
  if (reqUrl === undefined || !reqUrl.startsWith('/sound/')) {
    res.end('Hello.')
    return
  }

  res.setHeader('Access-Control-Allow-Origin', '*')
  if (reqUrl.startsWith('/sound/file')) {
    log.debug('Load sound zip file.')
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', 'attachment; filename="sounds.zip"')
    fs.createReadStream('sounds.zip').pipe(res)
    return
  } else if (reqUrl.startsWith('/sound/checksum')) {
    log.debug('checksum.')
    res.end('checksum')
    return
  }
  res.end(reqUrl)
})
const healthCheck = new HealthCheck()
const wss = createWebSocketServer(server, healthCheck, configuration)
wss.on('healthcheck', function(): void {
  configuration.reloadIfUpdatedAsync()
})
server.listen(configuration.port)
