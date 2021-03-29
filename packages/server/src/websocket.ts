import WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'
import http from 'http'

export interface Session extends WebSocket {
  alive: boolean
  id: string
  connectedTime: number
  lastPongTime: number
  blocked: boolean
  pendingMessageCount: number
  pendingCharCount: number
}

const PING_INTERVAL_MILLIS = 7 * 1000
const MAX_PENDING_MESSAGE_COUNT = 500
const MAX_PENDING_CHAR_COUNT = 5000

function receiveHeartbeat(this: WebSocket, data: Buffer): void {
  const self = this as Session
  console.log('heartbeat', self.id, data)
  self.alive = true
  self.lastPongTime = Date.now()
}

function sendMessage(ws: WebSocket, message:  WebSocket.Data): void {
  const s = ws as Session
  const charCount = message.toString().length
  s.pendingMessageCount++
  s.pendingCharCount += charCount
  s.send(message, (err: Error | undefined ) => {
    if (err) {
      console.error('Error on sending message:', s.id, err)
      return
    }
    s.pendingMessageCount--
    s.pendingCharCount -= charCount
  })
}

function onConnected(this: WebSocket.Server, ws: WebSocket): void {
  const server = this
  const client = ws as Session
  client.id = uuidv4()
  client.alive = true
  client.connectedTime = Date.now()
  client.lastPongTime = 0
  client.blocked = false
  client.on('pong', receiveHeartbeat)
  client.on('message', (message: WebSocket.Data): void => server.clients.forEach(c => sendMessage(c, message)))
  client.on('error', function(e: Error): void {
    const client = this as Session
    console.error('Socket error', client.id, e)
  })
  console.log('connected', client.id)
}

function checkPingPong(client: Session): void {
  if (!client.alive) {
    client.terminate()
    console.error(`Terminate ${client.id} due to no pong.`)
    return
  }

  client.alive = false
  client.ping()
}

function checkPendingCount(client: Session): void {
  if (client.pendingMessageCount > MAX_PENDING_MESSAGE_COUNT || client.pendingCharCount > MAX_PENDING_CHAR_COUNT) {
    console.error(
      `Terminate ${client.id} due to message retention.`,
      `messages:${client.pendingMessageCount}, characters:${client.pendingCharCount}`
    )
  }
}

export function createWebSocketServer(server: http.Server): WebSocket.Server {
  const wss = new WebSocket.Server({ server })
  wss.on('connection', onConnected)

  const healthCheckIntervalId: NodeJS.Timeout = setInterval((): void => {
    wss.clients.forEach((ws: WebSocket) => {
      const client = ws as Session
      checkPingPong(client)
      checkPendingCount(client)
    })
  }, PING_INTERVAL_MILLIS)
  wss.on('close', () => clearInterval(healthCheckIntervalId))

  return wss
}
