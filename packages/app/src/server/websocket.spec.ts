import { ClientSession, createWebSocketServer } from './websocket'
import WebSocket from 'ws'
import { Configuration, loadConfigAsync } from './Configuration'
import fs from 'fs'
import path from 'path'
import os from 'os'
import http from 'http'
import { Socket } from 'net'
import { AcnMessage, AcnOkMessage, AcnTokenMessage, ApplicationMessage, CloseCode, CommentMessage, ErrorMessage } from '@/common/Message'
import { assertNotNullable } from '@/common/assert'
import { getLogger, LogLevels } from '@/common/Logger'
import { HealthCheck, countUpPending, countDownPending } from './HealthCheck'
import { sign } from 'jsonwebtoken'
import { jest, test, expect, beforeEach, afterEach } from '@jest/globals'
import { playSoundCommand } from '@/sound/types'

jest.mock('http')
jest.mock('ws')
jest.mock('./HealthCheck')

let configuration: Configuration
let configPath: string
let sut: WebSocket.Server

beforeEach(async () => {
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
    jwtPrivateKeyPath: `${__dirname}/../../config/DO_NOT_USE-jwt.key.sample`,
    jwtPublicKeyPath: `${__dirname}/../../config/DO_NOT_USE-jwt.key.pub.sample`,
  }))
  const argv = {
    configPath,
    port: 8080,
    loglevel: LogLevels.INFO,
  }
  const cache = await loadConfigAsync(configPath, 0)
  assertNotNullable(cache.content, 'cache.content must be defined.')

  configuration = new Configuration(argv, cache.content, cache.stat.mtimeMs)

  jest.mocked(WebSocket.Server).mockImplementation(() => {
    return {
      on: jest.fn(),
      emit: jest.fn(),
    } as any // eslint-disable-line @typescript-eslint/no-explicit-any
  })
  jest.mocked(WebSocket).mockImplementation(() => {
    return {
      send: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
    } as any // eslint-disable-line @typescript-eslint/no-explicit-any
  })
  jest.mocked(http.IncomingMessage).mockImplementation(() => {
    return {
      socket: {
        remoteAddress: 'remoteAddress',
        remotePort: 56789,
      }
    } as http.IncomingMessage
  })
  jest.mocked(HealthCheck).mockImplementation(() => {
    return {
      add: jest.fn(),
      remove: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    } as any // eslint-disable-line @typescript-eslint/no-explicit-any
  })
})

afterEach(() => {
  if (sut) {
    try {
      // WebSocket is mocked, so call onclose directly.
      const onClose = jest.mocked(sut.on).mock.calls[1][1]
      onClose.bind(sut)()
    } catch (e: unknown) {
      // eslint-disable-next-line no-console
      console.warn(e)
    }
  }
  if (configPath) {
    fs.rmSync(configPath)
  }
})

function waitFor(validateSync: () => void, timeout = 1000, checkInterval = 50): Promise<void> {
  const start = Date.now()
  let elapsed = 0
  return new Promise<void>((resolve: () => void, reject: (reason: unknown) => void): void => {
    const check = (): void => {
      try {
        validateSync()
        resolve()
        return
      } catch (e: unknown) {
        elapsed = Date.now() - start
        if (elapsed >= timeout) {
          reject(e)
          return
        }
      }
      setTimeout(check, checkInterval)
    }
    check()
  })
}

function withFakeTimers(f: () => void) {
  try {
    jest.useFakeTimers()
    f()
  } finally {
    jest.useRealTimers()
  }
}

function callOnConnection() {
  const healthCheck = new HealthCheck()
  const server = createWebSocketServer(http.createServer(), healthCheck, configuration)
  const onConnection = jest.mocked(server.on).mock.calls[0][1]
  const session = new WebSocket('') as ClientSession
  const req = new http.IncomingMessage({} as Socket)
  onConnection.bind(server)(session, req)
  sut = server
  return { server, session, req, healthCheck }
}


test('Session initial properties', () => {
  const now = Date.now
  try {
    Date.now = () => 1234567890
    const { session, healthCheck } = callOnConnection()

    expect(session.id.length).toBe(56)
    expect(session.connectedTime).toBe(1234567890)
    expect(session.blocked).toBe(false)
    expect(healthCheck.add).toBeCalledWith(session)
  } finally {
    Date.now = now
  }
})

test('Acn OK, and count up before sending and count down after sended', async () => {
  const { session } = callOnConnection()
  expect(session.on).toBeCalledWith('message', expect.any(Function))
  const onMessage = jest.mocked(session.on).mock.calls[0][1]

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
    attrs: {
      token: new Array(190).fill('0').join(''),
    },
  }
  const charCount = JSON.stringify(res).length
  await waitFor(() => {
    expect(countUpPending).toBeCalledWith(session, charCount)
  })

  const cb0 = jest.mocked(session.send).mock.calls[0][1] as (err?: Error) => void
  cb0()
  expect(countDownPending).toBeCalledWith(session, charCount)
})

test('Acn failed, then close the session', () => {
  const { session } = callOnConnection()
  expect(session.on).toBeCalledWith('message', expect.any(Function))
  const onMessage = jest.mocked(session.on).mock.calls[0][1]

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

test('Autorization with token and OK', async () => {
  const { session } = callOnConnection()
  expect(session.on).toBeCalledWith('message', expect.any(Function))
  const onMessage = jest.mocked(session.on).mock.calls[0][1]
  const token = sign({ room: configuration.rooms[0].room }, configuration.jwtPrivateKey, { expiresIn: '1d', algorithm: 'ES256' })

  const m0: AcnTokenMessage = {
    type: 'acn',
    token,
  }
  onMessage.bind(session)(JSON.stringify(m0))
  const res: AcnOkMessage = {
    type: 'acn',
    attrs: {
      token,
    },
  }
  const charCount = JSON.stringify(res).length
  await waitFor(() => {
    expect(countUpPending).toBeCalledWith(session, charCount)
  })

  const cb0 = jest.mocked(session.send).mock.calls[0][1] as (err?: Error) => void
  cb0()
  expect(countDownPending).toBeCalledWith(session, charCount)
})

test('Authorization with token and verification failed', async () => {
  const { session } = callOnConnection()
  expect(session.on).toBeCalledWith('message', expect.any(Function))
  const onMessage = jest.mocked(session.on).mock.calls[0][1]
  const token = sign({ room: configuration.rooms[0].room }, configuration.jwtPrivateKey, { expiresIn: '0s', algorithm: 'ES256' })

  const m0: AcnTokenMessage = {
    type: 'acn',
    token,
  }
  onMessage.bind(session)(JSON.stringify(m0))

  const res: ErrorMessage = {
    type: 'error',
    error: 'ACN_FAILED',
    message: 'TokenExpiredError: jwt expired',
  }
  await waitFor(() => {
    expect(session.close).toBeCalledWith(CloseCode.ACN_FAILED, JSON.stringify(res))
  })
})

test('Authorization with token which has no room', async () => {
  const { session } = callOnConnection()
  expect(session.on).toBeCalledWith('message', expect.any(Function))
  const onMessage = jest.mocked(session.on).mock.calls[0][1]
  const token = sign({}, configuration.jwtPrivateKey, { expiresIn: '10s', algorithm: 'ES256' })

  const m0: AcnTokenMessage = {
    type: 'acn',
    token,
  }
  onMessage.bind(session)(JSON.stringify(m0))

  const res: ErrorMessage = {
    type: 'error',
    error: 'ACN_FAILED',
    message: 'No permission',
  }
  await waitFor(() => {
    expect(session.close).toBeCalledWith(CloseCode.ACN_FAILED, JSON.stringify(res))
  })
})

test('An unauthenticated session is closed if exists on boardcasting', () => {
  const { server, session } = callOnConnection()
  expect(session.on).toBeCalledWith('message', expect.any(Function))
  const onMessage = jest.mocked(session.on).mock.calls[0][1]

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
  const now = Date.now
  try {
    Date.now = () => 1234567890

    const { server, session } = callOnConnection()
    expect(session.on).toBeCalledWith('message', expect.any(Function))
    const onMessage = jest.mocked(session.on).mock.calls[0][1]

    session.room = 'room'
    const anotherRoomSession = new WebSocket('') as ClientSession
    anotherRoomSession.room = 'another room'
    const sameSession = new WebSocket('') as ClientSession
    sameSession.room = session.room
    const comment: CommentMessage = {
      type: 'comment',
      comment: 'some comment.',
      ts: 1234567890
    }
    server.clients = new Set([session, anotherRoomSession, sameSession])
    onMessage.bind(session)(JSON.stringify(comment))

    const sentComment = Object.assign({}, comment)
    sentComment.from = session.id
    const packet = JSON.stringify(sentComment)
    expect(session.send).toBeCalledWith(packet, expect.any(Function))
    expect(anotherRoomSession.send).not.toBeCalled()
    expect(sameSession.send).toBeCalledWith(packet, expect.any(Function))
  } finally {
    Date.now = now
  }
})

test('Drop PlaySoundMessage within 3000 ms', () => {
  const { server, session } = callOnConnection()
  expect(session.on).toBeCalledWith('message', expect.any(Function))
  const onMessage = jest.mocked(session.on).mock.calls[0][1]

  session.room = 'room'
  const anotherRoomSession = new WebSocket('') as ClientSession
  anotherRoomSession.room = 'another room'
  const sameSession = new WebSocket('') as ClientSession
  sameSession.room = session.room
  const playSound: ApplicationMessage = {
    type: 'app',
    cmd: playSoundCommand,
  }
  server.clients = new Set([session, anotherRoomSession, sameSession])

  let firstTime = 0
  let secondTime = 0

  // Within 3000 ms
  session.lastPlaySoundReceivedTime = 0
  withFakeTimers(() => {
    onMessage.bind(session)(JSON.stringify(playSound))
    firstTime = Date.now()
    jest.advanceTimersByTime(3000)
    onMessage.bind(session)(JSON.stringify(playSound))
    secondTime = Date.now()
  })
  const sentPlaySound = Object.assign({}, playSound)
  sentPlaySound.ts = firstTime
  sentPlaySound.from = session.id
  const packet = JSON.stringify(sentPlaySound)
  expect(session.send).toHaveBeenNthCalledWith(1, packet, expect.any(Function))

  // Over 3000ms
  session.lastPlaySoundReceivedTime = 0
  withFakeTimers(() => {
    onMessage.bind(session)(JSON.stringify(playSound))
    firstTime = Date.now()
    jest.advanceTimersByTime(3001)
    onMessage.bind(session)(JSON.stringify(playSound))
    secondTime = Date.now()
  })
  sentPlaySound.ts = firstTime
  const packet2 = JSON.stringify(sentPlaySound)
  expect(session.send).toHaveBeenNthCalledWith(2, packet2, expect.any(Function))
  sentPlaySound.ts = secondTime
  const packet3 = JSON.stringify(sentPlaySound)
  expect(session.send).toHaveBeenNthCalledWith(3, packet3, expect.any(Function))
})

test('Write log and remove session from health check on error', () => {
  const log = getLogger('websocket')
  log.info = jest.fn()
  const { session, healthCheck } = callOnConnection()
  expect(session.on).toBeCalledWith('error', expect.any(Function))
  const onError = jest.mocked(session.on).mock.calls[1][1]

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
  const onClose = jest.mocked(session.on).mock.calls[2][1]

  onClose.bind(session)(1001, 'reason')
  expect(log.info).toBeCalledWith('[onClose]', session.id, 1001, 'reason')
  expect(healthCheck.remove).toBeCalledWith(session)
})

test('Emit healthcheck event periodically', () => {
  withFakeTimers(() => {
    const healthCheck = new HealthCheck()
    sut = createWebSocketServer(http.createServer(), healthCheck, configuration)
    sut.clients = new Set()

    expect(healthCheck.start).toBeCalled()

    jest.advanceTimersByTime(6999)
    expect(sut.emit).not.toBeCalled()

    jest.advanceTimersByTime(1)
    expect(sut.emit).toBeCalledWith('healthcheck')
  })
})

test('Emit healthcheck event periodically', () => {
  const healthCheck = new HealthCheck()
  sut = createWebSocketServer(http.createServer(), healthCheck, configuration)

  expect(sut.on).toBeCalledWith('close', expect.any(Function))
  const onClose = jest.mocked(sut.on).mock.calls[1][1]
  onClose.bind(sut)()

  expect(healthCheck.stop).toBeCalled()
})
