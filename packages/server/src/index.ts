import fs from 'fs'
import https from 'https'
import 'tslib'
import { createWebSocketServer } from './websocket'

const server = https.createServer({
  cert: fs.readFileSync('dist/cert.pem'),
  key: fs.readFileSync('dist/key.pem')
}).on('request', (_, res): void => {
  res.end('Hello.')
})
const wss = createWebSocketServer(server)

server.listen(8080)