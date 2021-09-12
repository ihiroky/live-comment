import { PollStartMessage } from 'poll'
import { WebSocketClient } from 'wscomp'

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

export type StreamingClient = typeof WebSocketClient
