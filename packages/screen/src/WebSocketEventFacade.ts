import {
  WebSocketControl,
  Message,
  AcnMessage,
  CommentMessage,
  CloseCode,
  getLogger } from 'common'
import { MarqueePropsGenerator } from './MarqueePropsGenerator'

const log = getLogger('WebSocketProxy')

export class WebSocketEventFacade {

  private readonly room: string
  private readonly hash: string
  private webSocketControl: WebSocketControl | null
  private marqueePropsGenerator: MarqueePropsGenerator
  private reconnectTimer: number

  constructor(room: string, hash: string, marqueePropsGenerator: MarqueePropsGenerator) {
    this.room = room
    this.hash = hash
    this.webSocketControl = null
    this.marqueePropsGenerator = marqueePropsGenerator
    this.reconnectTimer = 0

    this.onOpen = this.onOpen.bind(this)
    this.onClose = this.onClose.bind(this)
    this.onError = this.onError.bind(this)
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

  send(message: Message): void {
    this.webSocketControl && this.webSocketControl.send(message)
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
    this.marqueePropsGenerator.onMessage(message)
  }

  onError(e: Event): void {
    log.debug(e)
  }
}
