import fs from 'fs'
import https from 'https'
import WebSocket from 'ws'
import 'tslib'
import { v4 as uuidv4 } from 'uuid'

interface MyWebSocket extends WebSocket {
  alive?: boolean
  id?: string
  connectedTime?: number
  lastPongTime?: number
}

const PING_INTERVAL_MILLIS = 7 * 1000

const server = https.createServer({
  cert: fs.readFileSync('dist/cert.pem'),
  key: fs.readFileSync('dist/key.pem')
}).on('request', (_, res): void => {
  res.end('Hello.')
})

function heartbeat(this: WebSocket, data: Buffer): void {
  const self = this as MyWebSocket
  console.log('heartbeat', self.id, data)
  self.alive = true
  self.lastPongTime = Date.now()
}

const wss = new WebSocket.Server({ server })
wss.on('connection', function(ws) {
  const client = ws as MyWebSocket
  client.id = uuidv4()
  client.alive = true
  client.connectedTime = Date.now()
  client.on('pong', heartbeat)
  client.on('message', function(message) {
    console.log('message', message)
    wss.clients.forEach(c => c.send(message))
  })
  client.send('connected.')
  console.log('connected', client.id)
})

// TODO handle upgrade to authenticate client

const pingInterval: NodeJS.Timeout = setInterval((): void => {
  wss.clients.forEach((ws: WebSocket) => {
    const client = ws as MyWebSocket
    if (!client.alive) {
      client.terminate()
      console.log('teminate', client.id)
    }
    client.alive = false
    client.ping()
    console.log('ping to ', client.id)
  })
}, PING_INTERVAL_MILLIS)
wss.on('close', () => clearInterval(pingInterval))

server.listen(8080)