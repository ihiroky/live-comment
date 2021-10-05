import { HealthCheck, countUpPending, countDownPending } from './HealthCheck'
import WebSocket from 'ws'
import { ClientSession } from './websocket'
import { CloseCode } from 'common'
import { mocked } from 'ts-jest/utils'

jest.mock('ws')
jest.useFakeTimers()

beforeAll(() => {
  // Remove jest option which overlaps Configuration
  const i = process.argv.findIndex(v => v === '-c')
  if (i > -1) {
    process.argv.splice(i, 2)
  }
})

test('countUpPending counts up messageCount and messageCharCount', () => {
  const ws = new WebSocket('') as ClientSession
  ws.pendingMessageCount = 1
  ws.pendingCharCount = 5

  countUpPending(ws, 10)

  expect(ws.pendingMessageCount).toBe(2)
  expect(ws.pendingCharCount).toBe(15)
})

test('countDownPending counts down messageCount and messageCharCount', () => {
  const ws = new WebSocket('') as ClientSession
  ws.pendingMessageCount = 2
  ws.pendingCharCount = 15

  countDownPending(ws, 10)

  expect(ws.pendingMessageCount).toBe(1)
  expect(ws.pendingCharCount).toBe(5)
})

test('Start slot timers', () => {
  const sut = new HealthCheck()
  const intervalIncrement = 7000 / 7

  sut.start()

  // Start slot timers
  expect(sut['slots'][0].timerId).not.toBeUndefined()
  expect(sut['slots'][1].timerId).toBeUndefined()

  for (let i = 1; i <= 5; i++) {
    jest.advanceTimersByTime(intervalIncrement)
    expect(sut['slots'][i].timerId).not.toBeUndefined()
    expect(sut['slots'][i + 1].timerId).toBeUndefined()
  }

  jest.advanceTimersByTime(intervalIncrement)
  expect(sut['slots'][6].timerId).not.toBeUndefined()
})

test('Session is terminated if not alive at checkPingPong', () => {
  const sut = new HealthCheck()
  sut.start()

  const ws = new WebSocket('') as ClientSession
  sut.add(ws)
  ws.alive = false
  jest.advanceTimersByTime(7000)

  expect(ws.terminate).toBeCalled()
})

test('Session does nothing if readyState is CLOSING', () => {
  const sut = new HealthCheck()
  sut.start()

  const ws = new WebSocket('') as ClientSession
  sut.add(ws)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(ws as any).readyState = WebSocket.CLOSING
  jest.advanceTimersByTime(7000)

  expect(ws.ping).not.toBeCalled()
})

test('Session does nothing if readyState is CLOSED', () => {
  const sut = new HealthCheck()
  sut.start()

  const ws = new WebSocket('') as ClientSession
  sut.add(ws)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(ws as any).readyState = WebSocket.CLOSED
  jest.advanceTimersByTime(7000)

  expect(ws.ping).not.toBeCalled()
})

test('Session alive gets false and ping if alive and not CLOSING or CLOSED', () => {
  const sut = new HealthCheck()
  sut.start()

  const ws = new WebSocket('') as ClientSession
  sut.add(ws)
  jest.advanceTimersByTime(7000)

  expect(ws.alive).toBe(false)
  expect(ws.ping).toBeCalled()
})

test('Do nothing if pending counts are under threshold', () => {
  const sut = new HealthCheck()
  sut.start()

  const ws = new WebSocket('') as ClientSession
  sut.add(ws)
  ws.pendingMessageCount = 500
  ws.pendingCharCount = 5000
  jest.advanceTimersByTime(7000)

  expect(ws.close).not.toBeCalled()
})

test('Session is closed if pending message count exceeds its threshold', () => {
  const sut = new HealthCheck()
  sut.start()

  const ws = new WebSocket('') as ClientSession
  sut.add(ws)
  ws.pendingMessageCount = 501
  ws.pendingCharCount = 5000
  jest.advanceTimersByTime(7000)

  const json = JSON.stringify({
    type: 'error',
    error: 'TOO_MANY_PENDING_MESSAGES',
    message: 'I can not stand it any longer.'
  })
  expect(ws.close).toBeCalledWith(CloseCode.TOO_MANY_PENDING_MESSAGES, json)
})

test('Session is closed if pending character count exceeds its threshold', () => {
  const sut = new HealthCheck()
  sut.start()

  const ws = new WebSocket('') as ClientSession
  sut.add(ws)
  ws.pendingMessageCount = 500
  ws.pendingCharCount = 5001
  jest.advanceTimersByTime(7000)

  const json = JSON.stringify({
    type: 'error',
    error: 'TOO_MANY_PENDING_MESSAGES',
    message: 'I can not stand it any longer.'
  })
  expect(ws.close).toBeCalledWith(CloseCode.TOO_MANY_PENDING_MESSAGES, json)
})

test('Stop all timers', () => {
  const sut = new HealthCheck()
  const slotStartingTimer = {} as NodeJS.Timeout
  sut['slotStartingTimer'] = slotStartingTimer
  const slotTimers: NodeJS.Timeout[] = []
  for (let i = 0; i < 7; i++) {
    slotTimers[i] = {} as NodeJS.Timeout
    sut['slots'][i].timerId = slotTimers[i]
  }
  global.clearTimeout = jest.fn()
  global.clearInterval = jest.fn()

  sut.stop()

  expect(clearTimeout).toBeCalledWith(slotStartingTimer)
  expect(sut['slotStartingTimer']).toBeUndefined()
  for (let i = 0; i < 7; i++) {
    expect(clearInterval).toHaveBeenNthCalledWith(i + 1, slotTimers[i])
    expect(sut['slots'][i].timerId).toBeUndefined()
    expect(sut['slots'][i].sessions).toEqual([])
  }
})

test('Properties of session are initialized by add()', () => {
  const sut = new HealthCheck()

  const ws = new WebSocket('') as ClientSession
  sut.add(ws)

  ws.healthCheckSlot = 0
  ws.alive = true
  ws.lastPongTime = 0
  ws.pendingMessageCount = 0
  ws.pendingCharCount = 0
})

test('Select slot which has minimum session count', () => {
  const sut = new HealthCheck()
  for (let i = 0; i < 7; i++) {
    sut['slots'][i].sessions.push(new WebSocket('') as ClientSession)
  }
  sut['slots'][3].sessions = []

  const ws = new WebSocket('') as ClientSession
  sut.add(ws)

  expect(sut['slots'][3].sessions).toEqual([ws])
})

test('Update alive and lastPongTime if pong packet is received', () => {
  const sut = new HealthCheck()
  const ws = new WebSocket('') as ClientSession
  sut.add(ws)

  ws.alive = false
  Date.now = () => 1234567890
  expect(ws.on).toBeCalledWith('pong', expect.any(Function))
  const receivePong = mocked(ws.on).mock.calls[0][1]
  receivePong.bind(ws)(Buffer.alloc(0))

  expect(ws.alive).toBe(true)
  expect(ws.lastPongTime).toBe(1234567890)
})

test('Remove session from its slot', () => {
  const ws0 = new WebSocket('') as ClientSession
  ws0.healthCheckSlot = 1
  const ws1 = new WebSocket('') as ClientSession
  ws1.healthCheckSlot = 1
  const ws2 = new WebSocket('') as ClientSession
  ws2.healthCheckSlot = 1
  const sut = new HealthCheck()
  sut['slots'][1] = {
    timerId: {} as NodeJS.Timeout,
    sessions: [ws0, ws1, ws2],
  }

  sut.remove(ws1)

  expect(sut['slots'][1].sessions).toEqual([ws0, ws2])
})
