import WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'
import http from 'http'
import fs from 'fs'

import {
  CloseCode,
  AcnMessage,
  ErrorMessage,
  isAcnMessage,
  isCommentMessage,
  getLogger,
  CommentMessage
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

const log = getLogger('websocket')

function receiveHeartbeat(this: WebSocket, data: Buffer): void {
  const self = this as ClientSession
  log.debug('[receiveHeartbeat] From', self.id)
  self.alive = true
  self.lastPongTime = Date.now()
}

function sendMessage(c: ClientSession, message: WebSocket.Data): void {
  const charCount = message.toString().length
  c.pendingMessageCount++
  c.pendingCharCount += charCount
  c.send(message, (err: Error | undefined) => {
    if (err) {
      log.error('[sendMessage] Error on sending message:', c.id, err)
      return
    }
    c.pendingMessageCount--
    c.pendingCharCount -= charCount
  })
}

function onAuthenticate(client: ClientSession, m: AcnMessage): void {
  log.debug('[onAuthenticate] From', client.id)
  fs.readFile('server.config.json', { encoding: 'utf8' }, (err: NodeJS.ErrnoException | null, data: string): void => {
    if (err) {
      log.error('[onAuthenticate] Failed to load server.conig.json', err)
      return
    }
    const config = JSON.parse(data) as ServerConfig
    for (const r of config.rooms) {
      if (r.room === m.room) {
        if (r.hash === m.hash) {
          log.debug('[onAuthentication] Room:', m.room)
          client.room = m.room
          return
        }
      }
    }
    log.debug('No room or invalid hash:', data)
    // TODO add type
    const message: ErrorMessage = {
      type: 'error',
      error: 'ACN_FAILED',
      message: 'Invalid room or hash.'
    }
    client.close(CloseCode.ACN_FAILED, JSON.stringify(message))
  })
}

function onComment(server: WebSocket.Server, data: WebSocket.Data, sender: ClientSession, comment: CommentMessage): void {
  if (!sender.room) {
    log.error('[onMessage] Unauthenticated client:', sender.id)
    sender.close()
  }
  log.trace('[onMessage]', comment.comment, 'from', sender.id, 'to', sender.room)
  server.clients.forEach((c: WebSocket): void => {
    const receiver = c as ClientSession
    if (receiver.room === sender.room) {
      sendMessage(receiver, data)
    }
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
      onComment(server, message, client, m)
    } else if (isAcnMessage(m)) {
      onAuthenticate(client, m)
    } else {
      log.debug('[onMessage]Unexpected message:', m)
    }
  })
  client.on('error', function (e: Error): void {
    const client = this as ClientSession
    log.info('[onError] Socket error', client.id, e)
  })
  client.on('close', function (this: WebSocket, code: number, reason: string): void {
    const c = this as ClientSession
    log.info('[onClose]', c.id, code, reason)
  })
  log.info('[onConnected]', client.id)
}

function checkPingPong(client: ClientSession): void {
  if (!client.alive) {
    client.terminate()
    log.info(`[checkPingPong] Terminate ${client.id} due to no pong.`)
    return
  }

  client.alive = false
  client.ping()
}

function checkPendingCount(client: ClientSession): void {
  if (client.pendingMessageCount > MAX_PENDING_MESSAGE_COUNT || client.pendingCharCount > MAX_PENDING_CHAR_COUNT) {
    log.error(
      '[checkPendingCount]',
      `Terminate ${client.id} due to too many pending messages.`,
      `messages:${client.pendingMessageCount}, characters:${client.pendingCharCount}`
    )
    const message: ErrorMessage = {
      type: 'error',
      error: 'TOO_MANY_PENDING_MESSAGES',
      message: 'I can not stand it any longer.'
    }
    client.close(CloseCode.TOO_MANY_PENDING_MESSAGES, JSON.stringify(message))
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
