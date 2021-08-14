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
}
