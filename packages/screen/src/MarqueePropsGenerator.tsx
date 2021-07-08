import {
  Message,
  AcnMessage,
  CommentMessage,
  isCommentMessage,
  CloseCode,
  WebSocketControl,
  getLogger
} from 'common'
import React from 'react'

export type MarqueeProps = {
  key: number
  level: number
  comment: string
  ref: React.RefObject<HTMLParagraphElement>
}

export type MarqueePropsList = Readonly<Readonly<MarqueeProps>[]>

const MAX_MESSAGES = 500
const SPACE_BETWEEN_COMMENTS = 128
const log = getLogger('MarqueePropsGenerator')

function calcMinimumEmptyLevel(messages: MarqueeProps[]): number {
  if (messages.length === 0 || messages[0].level > 0) {
    return 0
  }

  let nextLevel = 1
  for (let i = 1; i < messages.length; i++) {
    const m = messages[i]
    if (m.level > nextLevel) {
      return nextLevel
    }
    nextLevel = m.level + 1
  }
  return -1
}

function findLevelRightSpaceExists(marquees: MarqueeProps[]): number {
  if (marquees.length === 0 || marquees[0].level > 0) {
    return 0
  }

  let existsNoRightSpaceMarquee = false
  let prev = marquees[0]
  const windowInnerWidth = window.innerWidth
  for (const m of marquees) {
    if (m.level !== prev.level) {
      if (!existsNoRightSpaceMarquee) {
        return prev.level
      }
      existsNoRightSpaceMarquee = false
    }
    const element = m.ref.current
    if (element) {
      const rect = element.getBoundingClientRect()
      existsNoRightSpaceMarquee =
        existsNoRightSpaceMarquee || (rect.right + SPACE_BETWEEN_COMMENTS >= windowInnerWidth)
    } else {
      // Not rendered yet.
      existsNoRightSpaceMarquee = true
    }
    prev = m
  }
  return !existsNoRightSpaceMarquee ? prev.level : -1
}

export class MarqueePropsGenerator {

  private readonly room: string
  private readonly hash: string
  private readonly duration: number
  private readonly marqueePropsListUpdated: (marqueePropsList: MarqueePropsList) => void
  private marquees: MarqueeProps[]
  private webSocketControl: WebSocketControl | null
  private reconnectTimer: number

  constructor(room: string, hash: string, duration: number, listener: (marqueePropsList: MarqueePropsList) => void) {
    this.room = room
    this.hash = hash
    this.duration = duration
    this.marquees = []
    this.webSocketControl = null
    this.reconnectTimer = 0
    this.marqueePropsListUpdated = listener

    this.onOpen = this.onOpen.bind(this)
    this.onClose = this.onClose.bind(this)
    this.onMessage = this.onMessage.bind(this)
  }

  close(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
    }
    if (this.webSocketControl) {
      this.webSocketControl.close()
    }
  }

  onOpen(control: WebSocketControl): void {
    log.debug('[onOpen]', control)
    const message: AcnMessage = {
      type: 'acn',
      room: this.room,
      hash: this.hash
    }
    control.send(message)
    this.webSocketControl = control
  }

  onClose(ev: CloseEvent): void {
    if (this.webSocketControl) {
      this.webSocketControl.close()
    }
    if (ev.code === CloseCode.ACN_FAILED) {
      const comment: CommentMessage = {
        type: 'comment',
        comment: 'Room authentication failed. Please check your setting 🙏'
      }
      this.onMessage(comment)
      return
    }

    const comment: CommentMessage = {
      type: 'comment',
      comment: `Connection closed: ${ev.code}`
    }
    this.onMessage(comment)

    const waitMillis = 3000 + 7000 * Math.random()
    this.reconnectTimer = window.setTimeout((): void => {
      this.reconnectTimer = 0
      log.info('[onClose] Try to reconnect.')
      this.webSocketControl?.reconnect()
    }, waitMillis)
    log.info(`[onClose] Reconnect after ${waitMillis}ms.`)
  }

  onMessage(message: Message): void {
    const now = Date.now()
    if (!isCommentMessage(message)) {
      log.warn('[onMessage] Unexpected message:', message)
      return
    }

    const marquees = this.marquees.filter(m => now - m.key <= this.duration)
    if (marquees.length >= MAX_MESSAGES)  {
      log.warn('[onMessage] Dropped:', message.comment)
      return
    }

    const length = marquees.length
    let level = calcMinimumEmptyLevel(marquees)
    if (level === -1) {
      level = findLevelRightSpaceExists(marquees)
      if (level === -1) {
        level = length > 0 ? marquees[length - 1].level + 1 : 0
      }
    }

    let insertPosition = marquees.length
    if (length > 0 && marquees[length - 1].level >= level) {
      for (let i = marquees.length - 1; i >= 0; i--) {
        if (marquees[i].level === level) {
          insertPosition = i
          break
        }
      }
    }

    marquees.splice(insertPosition, 0, {
      key: now,
      comment: message.comment,
      level: level,
      ref: React.createRef<HTMLParagraphElement>()
    })
    this.marquees = marquees
    this.marqueePropsListUpdated(marquees)
  }
}
