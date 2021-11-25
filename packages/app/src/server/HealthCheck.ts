import  WebSocket from 'ws'
import { CloseCode, ErrorMessage } from '@/common/Message'
import { getLogger } from '@/common/Logger'
import { ClientSession } from "./websocket"

const SLOT_NUM = 7
const INTERVAL = SLOT_NUM * 1000
const MAX_PENDING_MESSAGE_COUNT = 500
const MAX_PENDING_CHAR_COUNT = 5000

type Slot = {
  timerId: NodeJS.Timeout | undefined
  sessions: ClientSession[]
}

const log = getLogger('HealthCheck')

function checkPingPong(client: ClientSession): void {
  if (!client.alive) {
    client.terminate()
    log.info(`[checkPingPong] Terminate ${client.id} due to no pong.`)
    return
  }
  if (client.readyState === WebSocket.CLOSING || client.readyState === WebSocket.CLOSED) {
    log.info(`[checkPingPong] Found CLOSING/CLOSED socket ${client.id}. Skip to ping.`)
    return
  }

  client.alive = false
  client.ping()
}

function receiveHeartbeat(this: WebSocket, data: Buffer): void {
  const self = this as ClientSession
  log.debug('[receiveHeartbeat] From', self.id, data.toString())
  self.alive = true
  self.lastPongTime = Date.now()
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

export function countUpPending(client: ClientSession, charCount: number): void {
  client.pendingMessageCount++
  client.pendingCharCount += charCount
}

export function countDownPending(client: ClientSession, charCount: number): void {
  client.pendingMessageCount--
  client.pendingCharCount -= charCount
}

export class HealthCheck {
  private readonly slots: Slot[]
  private slotStartingTimer: NodeJS.Timeout | undefined

  constructor() {
    this.slots = new Array<Slot>(SLOT_NUM)
    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i] = {
        timerId: undefined,
        sessions: []
      }
    }
    this.slotStartingTimer = undefined
  }

  start(): void {
    const startInterval = INTERVAL / SLOT_NUM
    let slotIndex = 0
    const startSlot = (): void => {
      this.slotStartingTimer = undefined
      const slot = this.slots[slotIndex]
      slot.timerId = setInterval((): void => {
        for (const session of slot.sessions) {
          checkPingPong(session)
          checkPendingCount(session)
        }
      }, INTERVAL)
      if (++slotIndex < SLOT_NUM) {
        this.slotStartingTimer = setTimeout(startSlot, startInterval)
      }
    }
    startSlot()
  }

  stop(): void {
    if (this.slotStartingTimer) {
      clearTimeout(this.slotStartingTimer)
      this.slotStartingTimer = undefined
    }
    for (const slot of this.slots) {
      if (slot.timerId) {
        clearInterval(slot.timerId)
      }
      slot.timerId = undefined
      slot.sessions = []
    }
  }

  add(session: ClientSession): void {
    const minCountIndex = this.slots
      .map((s: Slot, i: number): [number, number] => [s.sessions.length, i])
      .sort((a, b) => a[0] - b[0])[0][1]
    const slot = this.slots[minCountIndex]
    slot.sessions.push(session)

    session.healthCheckSlot = minCountIndex
    session.alive = true
    session.lastPongTime = 0
    session.pendingMessageCount = 0
    session.pendingCharCount = 0
    session.on('pong', receiveHeartbeat)
  }

  remove(session: ClientSession): void {
    if (session.healthCheckSlot === undefined) {
      return
    }

    const sessions = this.slots[session.healthCheckSlot].sessions
    const i = sessions.findIndex(s => s === session)
    if (i > -1) {
      sessions.splice(i, 1)
    }
  }
}