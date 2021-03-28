import { createServer } from 'http'
import { createWebSocketServer } from './websocket'
import 'tslib'

const server = createServer().on('request', (_, res): void => {
  res.end('Hello.')
})
const wss = createWebSocketServer(server)

server.listen(8080)
