import WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'
import http from 'http'
import fs from 'fs'

import {
  AcnMessage,
  isAcnMessage,
  isCommentMessage,
} from 'common'

interface ServerConfig {
  rooms: {
    room: string
    hash: string
  }[]
}
export interface ClientSession extends WebSocket {
  alive: boolean
  id: string
  connectedTime: number
  lastPongTime: number
  blocked: boolean
  pendingMessageCount: number
  pendingCharCount: number
  room: string
}

const PING_INTERVAL_MILLIS = 7 * 1000
const MAX_PENDING_MESSAGE_COUNT = 500
const MAX_PENDING_CHAR_COUNT = 5000

function receiveHeartbeat(this: WebSocket, data: Buffer): void {
  const self = this as ClientSession
  console.log('heartbeat', self.id, data)
  self.alive = true
  self.lastPongTime = Date.now()
}

function sendMessage(ws: WebSocket, message: WebSocket.Data): void {
  const s = ws as ClientSession
  const charCount = message.toString().length
  s.pendingMessageCount++
  s.pendingCharCount += charCount
  s.send(message, (err: Error | undefined) => {
    if (err) {
      console.error('Error on sending message:', s.id, err)
      return
    }
    s.pendingMessageCount--
    s.pendingCharCount -= charCount
  })
}

function onAuthenticate(client: ClientSession, m: AcnMessage): void {
  fs.readFile('server.config.json', { encoding: 'utf8' }, (err: NodeJS.ErrnoException | null, data: string): void => {
    if (err) {
      console.error('Failed to load server.conig.json', err)
      return
    }
    const config = JSON.parse(data) as ServerConfig
    for (const r of config.rooms) {
      if (r.room === m.room) {
        if (r.hash === m.hash) {
          console.log('Room:', m.room)
          client.room = m.room
          return
        }
      }
    }
    console.log('No room or invalid hash:', data)
    // TODO add type
    const message = {
      error: 1,
      message: 'Invalid room or hash.'
    }
    client.send(JSON.stringify(message))
    client.close()
  })
}

function onConnected(this: WebSocket.Server, ws: WebSocket): void {
  const server = this
  const client = ws as ClientSession
  client.id = uuidv4()
  client.alive = true
  client.connectedTime = Date.now()
  client.lastPongTime = 0
  client.blocked = false
  client.on('pong', receiveHeartbeat)
  client.on('message', (message: WebSocket.Data): void => {
    const data = message.toString()
    const m = JSON.parse(data)
    if (isCommentMessage(m)) {
      if (!client.room) {
        console.error('Unauthenticated client:', client.id)
        client.close()
      }
      server.clients.forEach(c => sendMessage(c, message))
    } else if (isAcnMessage(m)) {
      console.log(`AcnMessage: ${data}`)
      onAuthenticate(client, m)
    } else {
      console.error(`Unexpected message: ${m}`)
    }
  })
  client.on('error', function (e: Error): void {
    const client = this as ClientSession
    console.error('Socket error', client.id, e)
  })
  console.log('connected', client.id)
}

function checkPingPong(client: ClientSession): void {
  if (!client.alive) {
    client.terminate()
    console.error(`Terminate ${client.id} due to no pong.`)
    return
  }

  client.alive = false
  client.ping()
}

function checkPendingCount(client: ClientSession): void {
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
      const client = ws as ClientSession
      checkPingPong(client)
      checkPendingCount(client)
    })
  }, PING_INTERVAL_MILLIS)
  wss.on('close', () => clearInterval(healthCheckIntervalId))

  return wss
}
