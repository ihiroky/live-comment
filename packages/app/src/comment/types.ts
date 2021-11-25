import { isObject } from '@/common/utils'
import { ApplicationMessage } from '@/common/Message'
import { PollStartMessage } from '@/poll/types'

export type AppState = {
  comments: {
    key: number
    comment: string
    pinned: boolean
  }[]
  polls: {
    key: number
    owner: string
    id: PollStartMessage['id']
    title: PollStartMessage['title']
    entries: PollStartMessage['entries']
  }[]
  autoScroll: boolean
  sendWithCtrlEnter: boolean
  openSoundPanel: boolean
}

export type PlaySoundMessage = ApplicationMessage & {
  cmd: 'sound/play'
  id: string
}

export function isPlaySoundMessage(obj: unknown): obj is PlaySoundMessage {
  // type: 'app', cmd: 'sound/play', id
  return isObject(obj) &&
    obj.type === 'app' &&
    obj.cmd === 'sound/play' &&
    typeof obj.id === 'string'
}