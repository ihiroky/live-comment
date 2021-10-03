import { ApplicationMessage, isObject } from 'common'
import { PollStartMessage } from 'poll'

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

export const AppCookieNames = [
  'room',
  'password',
  'saveCred',
  'autoScroll',
  'sendWithCtrlEnter',
  'openSoundPanel',
] as const
export type AppCookieName = typeof AppCookieNames[number]

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