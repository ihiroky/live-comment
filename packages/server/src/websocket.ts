import WebSocket from 'ws'
import http from 'http'
import crypto from 'crypto'
import { Configuration } from './Configuration'

import {
  CloseCode,
  AcnMessage,
  ErrorMessage,
  isAcnMessage,
  getLogger,
  CommentMessage,
  getRandomInteger,
} from 'common'
import { ApplicationMessage, isClientMessage } from 'common'
import { AcnOkMessage } from 'common/src/Message'
import { HealthCheck, countUpPending, countDownPending } from './HealthCheck'

export interface ClientSession extends WebSocket {
  alive: boolean
  id: string
  connectedTime: number
  lastPongTime: number
  blocked: boolean
  pendingMessageCount: number
  pendingCharCount: number
  room?: string
  healthCheckSlot?: number
}

// TODO optimize send message loop
export interface ServerSession extends WebSocket.Server {
  rooms: Map<string, ClientSession[]>
}

const log = getLogger('websocket')

function sendMessage(c: ClientSession, message: WebSocket.Data): void {
  const charCount = message.toString().length
  countUpPending(c, charCount)
  c.send(message, (err: Error | undefined) => {
    if (err) {
      log.error('[sendMessage] Error on sending message:', c.id, err)
      return
    }
    countDownPending(c, charCount)
  })
}

function authenticate(client: ClientSession, m: AcnMessage, configuration: Configuration): void {
  log.debug('[authenticate] From', client.id)
  for (const r of configuration.rooms) {
    if (r.room === m.room && r.hash === m.hash) {
      log.debug('[authenticate] Room:', m.room)
      client.room = m.room
      const ok: AcnOkMessage = {
        type: 'acn',
        attrs: {},
      }
      sendMessage(client, JSON.stringify(ok))
      return
    }
  }
  log.debug('No room or invalid hash:', m)
  const message: ErrorMessage = {
    type: 'error',
    error: 'ACN_FAILED',
    message: 'Invalid room or hash.'
  }
  client.close(CloseCode.ACN_FAILED, JSON.stringify(message))
}

function broadcast(
  server: WebSocket.Server,
  sender: ClientSession,
  message: CommentMessage | ApplicationMessage
): void {
  if (!sender.room) {
    log.error('[onMessage] Unauthenticated client:', sender.id)
    sender.close()
    return
  }
  log.debug('[onMessage]', message, 'from', sender.id, 'to', sender.room)
  message.from = sender.id
  const serialized = JSON.stringify(message)
  const room = sender.room
  const to = message.to
  server.clients.forEach((c: WebSocket): void => {
    const receiver = c as ClientSession
    if (receiver.room === room && (!to || receiver.id === to)) {
      sendMessage(receiver, serialized)
    }
  })
}

function onConnected(
  server: WebSocket.Server,
  ws: WebSocket,
  req: http.IncomingMessage,
  healthCheck: HealthCheck,
  configuration: Configuration
): void {
  // TODO desktopだけ細かい情報を取れる特権をもつ: client識別子、特殊なコマンドを送れる等
  //      AcnMessageにpreciseオプションついてたらおくる
  const client = ws as ClientSession
  client.id = crypto.createHash('sha224')
    .update(req.socket.remoteAddress + ':' + req.socket.remotePort + ':' + getRandomInteger(), 'ascii')
    .digest('hex')
  client.connectedTime = Date.now()
  client.blocked = false
  healthCheck.add(client)
  client.on('message', (message: WebSocket.Data): void => {
    const data = message.toString()
    const m = JSON.parse(data)
    if (isClientMessage(m)) {
      broadcast(server, client, m)
    } else if (isAcnMessage(m)) {
      authenticate(client, m, configuration)
    } else {
      log.debug('[onMessage] Unexpected message:', m)
    }
  })
  client.on('error', function (e: Error): void {
    const client = this as ClientSession
    log.info('[onError] Socket error', client.id, e)
    healthCheck.remove(client)
  })
  client.on('close', function (this: WebSocket, code: number, reason: string): void {
    const c = this as ClientSession
    log.info('[onClose]', c.id, code, reason)
    healthCheck.remove(client)
  })
  log.info('[onConnected]', client.id)
}

export function createWebSocketServer(
  server: http.Server,
  healthCheck: HealthCheck,
  configuration: Configuration
): WebSocket.Server {
  healthCheck.start()
  const wss = new WebSocket.Server({ server })
  wss.on('connection', function(ws: WebSocket, req: http.IncomingMessage): void {
    log.debug('onconnect', req.socket.remoteAddress)
    onConnected(this, ws, req, healthCheck, configuration)
  })

  const healthCheckIntervalId: NodeJS.Timeout = setInterval((): void => {
    wss.emit('healthcheck')
  }, 7 * 1000)
  wss.on('close', (): void => {
    healthCheck.stop()
    clearInterval(healthCheckIntervalId)
  })

  return wss
}
