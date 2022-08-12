import { ReconnectableWebSocket } from '@/wscomp/rws'
import { PublishableMessageSource } from '@/screen/MessageScreen'
import { getLogger } from '@/common/Logger'
import { AcnMessage, CloseCode, CommentMessage } from '@/common/Message'

const log = getLogger('rendererHooks')

export const onOpen = (
  rws: ReconnectableWebSocket,
  room: string,
  hash: string,
  psrc: PublishableMessageSource
): void => {
  log.debug('[onOpen]')
  const comment: CommentMessage = {
    type: 'comment',
    comment: `🎉 Connected to ${rws.url} 🎉`,
  }
  psrc.publish(comment)
  const message: AcnMessage = {
    type: 'acn',
    room,
    hash,
  }
  rws.send(message)
}

export const onClose = (rws: ReconnectableWebSocket, ev: CloseEvent, psrc: PublishableMessageSource): void => {
  if (ev.code === CloseCode.ACN_FAILED) {
    const comment: CommentMessage = {
      type: 'comment',
      comment: 'Room authentication failed. Please check your setting 👀'
    }
    psrc.publish(comment)
    return
  }

  const comment: CommentMessage = {
    type: 'comment',
    comment: `Failed to connect to the server (${ev.code}) 😢`
  }
  psrc.publish(comment)
  rws.reconnectWithBackoff()
}
