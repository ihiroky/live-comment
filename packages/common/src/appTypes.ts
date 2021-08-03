import { ApplicationMessage } from './Message'

export type PollEntry = {
  key: number
  description: string
  count: number
}

export interface PollStartMessage extends ApplicationMessage {
  type: 'app'
  cmd: 'poll/start'
  entries: Pick<PollEntry, 'key' | 'description'>[]
}

export interface PollMessage extends ApplicationMessage {
  type: 'app'
  cmd: 'poll/poll'
  cid: string
  choice: PollEntry['key']
}

export interface PollFinishMessage extends ApplicationMessage {
  type: 'app'
  cmd: 'poll/finish'
}
