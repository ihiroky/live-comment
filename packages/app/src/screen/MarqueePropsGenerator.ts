import {
  Message,
  AcnMessage,
  CommentMessage,
  isCommentMessage,
  CloseCode,
} from '@/common/Message'
import { getLogger } from '@/common/Logger'
import { getRandomInteger } from '@/common/utils'
import { createRef, RefObject } from 'react'
import { ReconnectableWebSocket } from '@/wscomp/rws'

export type MarqueeProps = {
  key: number
  created: number
  level: number
  comment: string
  ref: RefObject<HTMLParagraphElement>
}

export type MarqueePropsList = Readonly<Readonly<MarqueeProps>[]>

const SPACE_BETWEEN_COMMENTS = 384
const MAX_MESSAGES = 500
const log = getLogger('MarqueePropsGenerator')

export function calcMinimumEmptyLevel(sorted: MarqueeProps[]): number {
  if (sorted.length === 0 || sorted[0].level > 0) {
    return 0
  }

  let nextLevel = 1
  for (let i = 1; i < sorted.length; i++) {
    const m = sorted[i]
    if (m.level > nextLevel) {
      return nextLevel
    }
    if (nextLevel === m.level) {
      nextLevel = m.level + 1
    }
  }
  return -1
}

export function findLevelRightSpaceExists(marquees: MarqueeProps[]): number {
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
  private rws: ReconnectableWebSocket | null

  constructor(room: string, hash: string, duration: number, listener: (marqueePropsList: MarqueePropsList) => void) {
    this.room = room
    this.hash = hash
    this.duration = duration
    this.marquees = []
    this.rws = null
    this.marqueePropsListUpdated = listener
  }

  close(): void {
    if (this.rws) {
      this.rws.close()
    }
  }

  readonly setRws = (rws: ReconnectableWebSocket | null): void => {
    this.rws = rws
  }

  readonly onOpen = (): void => {
    log.debug('[onOpen]')
    const comment: CommentMessage = {
      type: 'comment',
      comment: `Connected to ${this.rws?.url}`,
    }
    this.onMessage(comment)
    const message: AcnMessage = {
      type: 'acn',
      room: this.room,
      hash: this.hash
    }
    this.rws?.send(message)
  }

  readonly onClose = (ev: CloseEvent): void => {
    if (ev.code === CloseCode.ACN_FAILED) {
      const comment: CommentMessage = {
        type: 'comment',
        comment: 'Room authentication failed. Please check your setting (._.)'
      }
      this.onMessage(comment)
      return
    }

    const comment: CommentMessage = {
      type: 'comment',
      comment: `Failed to connect to the server (${ev.code}) (T-T)`
    }
    this.onMessage(comment)
    this.rws?.reconnectWithBackoff()
  }

  readonly onMessage = (message: Message): void => {
    const now = Date.now()
    if (!isCommentMessage(message)) {
      log.debug('[onMessage] Unexpected message:', message)
      return
    }

    const marquees = this.marquees.filter(m => now - m.created <= this.duration)
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
        if (marquees[i].level <= level) {
          insertPosition = i + 1
          break
        }
      }
    }

    marquees.splice(insertPosition, 0, {
      key: getRandomInteger(),
      created: now,
      comment: message.comment,
      level: level,
      ref: createRef<HTMLParagraphElement>()
    })
    this.marquees = marquees
    this.marqueePropsListUpdated(marquees)
  }
}
