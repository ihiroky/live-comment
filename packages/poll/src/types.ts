import { ApplicationMessage, isObject } from 'common'

export type PollEntry = {
  key: number
  description: string
  count: number
}

export interface PollStartMessage extends ApplicationMessage {
  type: 'app'
  cmd: 'poll/start'
  title: string
  entries: Pick<PollEntry, 'key' | 'description'>[]
}

export interface PollMessage extends ApplicationMessage {
  type: 'app'
  cmd: 'poll/poll'
  cid?: string
  choice: PollEntry['key']
}

export interface PollFinishMessage extends ApplicationMessage {
  type: 'app'
  cmd: 'poll/finish'
}

export function isPollMessage(m: unknown): m is PollMessage {
  return isObject(m) && m.type === 'app' && m.cmd === 'poll/poll'
}

export function isPollStartMessage(m: unknown): m is PollStartMessage {
  return isObject(m) && m.type === 'app' && m.cmd === 'poll/start'
}

export function isPollFinishMessage(m: unknown): m is PollFinishMessage {
  return isObject(m) && m.type === 'app' && m.cmd === 'poll/finish'
}

export type Mode =
  | 'edit'
  | 'poll'
  | 'result-list'
  | 'result-graph'

export type Progress = Map<PollMessage['cid'], PollEntry['key']>
export type Update = Map<PollEntry['key'], number>
