import { ClientSession, createWebSocketServer } from './websocket'
import WebSocket from 'ws'
import { Configuration } from './Configuration'
import fs from 'fs'
import path from 'path'
import os from 'os'
import http from 'http'
import { mocked } from 'ts-jest/utils'
import { Socket } from 'net'
import { AcnMessage, AcnOkMessage, CloseCode, CommentMessage, ErrorMessage, getLogger, LogLevels } from 'common'
import { HealthCheck, countUpPending, countDownPending } from './HealthCheck'

jest.mock('http')
jest.mock('ws')
jest.mock('./HealthCheck')
jest.useFakeTimers()

let configuration: Configuration
let configPath: string

beforeEach(() => {
  // Remove jest option which overlaps Configuration
  const i = process.argv.findIndex(v => v === '-c')
  if (i > -1) {
    process.argv.splice(i, 2)
  }

  configPath = path.join(os.tmpdir(), 'test.json')
  process.argv.push(...['--configPath', configPath])
  fs.writeFileSync(configPath, JSON.stringify({
    rooms: [{
      room: 'test',
      hash: 'ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db27ac185f8a0e1d5f84f88bc887fd67b143732c304cc5fa9ad8e6f57f50028a8ff',
    }, {
      room: 'hoge',
      hash: 'dbb50237ad3fa5b818b8eeca9ca25a047e0f29517db2b25f4a8db5f717ff90bf0b7e94ef4f5c4e313dfb06e48fbd9a2e40795906a75c470cdb619cf9c2d4f6d9',
    }],
  }))
  const argv = {
    configPath,
    port: 8080,
    loglevel: LogLevels.INFO,
  }
  configuration = new Configuration(argv)

  mocked(WebSocket.Server).mockImplementation(() => {
    return {
      on: jest.fn(),
      emit: jest.fn()
    } as any // eslint-disable-line @typescript-eslint/no-explicit-any
  })
  mocked(WebSocket).mockImplementation(() => {
    return {
      send: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
    } as any // eslint-disable-line @typescript-eslint/no-explicit-any
  })
  mocked(http.IncomingMessage).mockImplementation(() => {
    return {
      socket: {
        remoteAddress: 'remoteAddress',
        remotePort: 56789,
      }
    } as http.IncomingMessage
  })
  mocked(HealthCheck).mockImplementation(() => {
    return {
      add: jest.fn(),
      remove: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    } as any // eslint-disable-line @typescript-eslint/no-explicit-any
  })
  Date.now = () => 1234567890
})

afterEach(() => {
  if (configPath) {
    fs.rmSync(configPath)
  }
})

function callOnConnection() {
  const healthCheck = new HealthCheck()
  const server = createWebSocketServer(http.createServer(), healthCheck, configuration)
  const onConnection = mocked(server.on).mock.calls[0][1]
  const session = new WebSocket('') as ClientSession
  const req = new http.IncomingMessage({} as Socket)
  onConnection.bind(server)(session, req)
  return { server, session, req, healthCheck }
}


test('Session initial properties', () => {
  const { session, healthCheck } = callOnConnection()

  expect(session.id.length).toBe(56)
  expect(session.connectedTime).toBe(1234567890)
  expect(session.blocked).toBe(false)
  expect(healthCheck.add).toBeCalledWith(session)
})

test('Acn OK, and count up before sending and count down after sended', () => {
  const { session } = callOnConnection()
  expect(session.on).toBeCalledWith('message', expect.any(Function))
  const onMessage = mocked(session.on).mock.calls[0][1]

  session.pendingMessageCount = 0
  session.pendingCharCount = 0
  const m0: AcnMessage = {
    type: 'acn',
    room: configuration.rooms[0].room,
    hash: configuration.rooms[0].hash,
  }
  onMessage.bind(session)(JSON.stringify(m0))
  const res: AcnOkMessage = {
    type: 'acn',
    attrs: { sessionId: new Array(56).fill('0').join('') },
  }
  const charCount = JSON.stringify(res).length
  expect(countUpPending).toBeCalledWith(session, charCount)

  const cb0 = mocked(session.send).mock.calls[0][1] as (err?: Error) => void
  cb0()
  expect(countDownPending).toBeCalledWith(session, charCount)
})

test('Acn failed, then close the session', () => {
  const { session } = callOnConnection()
  expect(session.on).toBeCalledWith('message', expect.any(Function))
  const onMessage = mocked(session.on).mock.calls[0][1]

  const m: AcnMessage = {
    type: 'acn',
    room: 'test',
    hash: 'test',
  }
  onMessage.bind(session)(JSON.stringify(m))

  const expectedMessage: ErrorMessage = {
    type: 'error',
    error: 'ACN_FAILED',
    message: 'Invalid room or hash.',
  }
  expect(session.close).toBeCalledWith(CloseCode.ACN_FAILED, JSON.stringify(expectedMessage))
})

test('An unauthenticated session is closed if exists on boardcasting', () => {
  const { server, session } = callOnConnection()
  expect(session.on).toBeCalledWith('message', expect.any(Function))
  const onMessage = mocked(session.on).mock.calls[0][1]

  expect(session.room).toBeUndefined()
  const m: CommentMessage = {
    type: 'comment',
    comment: 'some comment.',
  }
  server.clients = new Set([session])
  server.clients.forEach = jest.fn()
  onMessage.bind(session)(JSON.stringify(m))

  expect(session.close).toBeCalled()
  expect(server.clients.forEach).not.toBeCalled()
})

test('Broardcast in the sender room', () => {
  const { server, session } = callOnConnection()
  expect(session.on).toBeCalledWith('message', expect.any(Function))
  const onMessage = mocked(session.on).mock.calls[0][1]

  session.room = 'room'
  const anotherRoomSession = new WebSocket('') as ClientSession
  anotherRoomSession.room = 'another room'
  const sameSession = new WebSocket('') as ClientSession
  sameSession.room = session.room
  const comment: CommentMessage = {
    type: 'comment',
    comment: 'some comment.',
  }
  server.clients = new Set([session, anotherRoomSession, sameSession])
  onMessage.bind(session)(JSON.stringify(comment))

  const sentComment = Object.assign({}, comment)
  sentComment.from = session.id
  const packet = JSON.stringify(sentComment)
  expect(session.send).toBeCalledWith(packet, expect.any(Function))
  expect(anotherRoomSession.send).not.toBeCalled()
  expect(sameSession.send).toBeCalledWith(packet, expect.any(Function))
})

test('Write log and remove session from health check on error', () => {
  const log = getLogger('websocket')
  log.info = jest.fn()
  const { session, healthCheck } = callOnConnection()
  expect(session.on).toBeCalledWith('error', expect.any(Function))
  const onError = mocked(session.on).mock.calls[1][1]

  const error = new Error('error')
  onError.bind(session)(error)
  expect(log.info).toBeCalledWith('[onError] Socket error', session.id, error)
  expect(healthCheck.remove).toBeCalledWith(session)
})

test('Write log and remove session from health check on close', () => {
  const log = getLogger('websocket')
  log.info = jest.fn()
  const { session, healthCheck } = callOnConnection()
  expect(session.on).toBeCalledWith('close', expect.any(Function))
  const onClose = mocked(session.on).mock.calls[2][1]

  onClose.bind(session)(1001, 'reason')
  expect(log.info).toBeCalledWith('[onClose]', session.id, 1001, 'reason')
  expect(healthCheck.remove).toBeCalledWith(session)
})

test('Emit healthcheck event periodically', () => {
  const healthCheck = new HealthCheck()
  const server = createWebSocketServer(http.createServer(), healthCheck, configuration)
  server.clients = new Set()

  expect(healthCheck.start).toBeCalled()

  jest.advanceTimersByTime(6999)
  expect(server.emit).not.toBeCalled()

  jest.advanceTimersByTime(1)
  expect(server.emit).toBeCalledWith('healthcheck')
})

test('Emit healthcheck event periodically', () => {
  const healthCheck = new HealthCheck()
  const server = createWebSocketServer(http.createServer(), healthCheck, configuration)

  expect(server.on).toBeCalledWith('close', expect.any(Function))
  const onClose = mocked(server.on).mock.calls[1][1]
  onClose.bind(server)()

  expect(healthCheck.stop).toBeCalled()
})
