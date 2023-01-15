import { PollStartMessage } from '@/poll/types'

export type AppState = {
  comments: {
    key: number
    comment: string
    pinned: boolean
    ts: number
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
