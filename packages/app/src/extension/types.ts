import { Message } from '@/common/Message'

export type CommentEvent =
  | CommentOpenEvent
  | CommentCloseEvent
  | CommentMessageEvent
  | CommentErrorEvent

export type CommentOpenEvent = {
  type: 'comment-open'
}

export type CommentCloseEvent = {
  type: 'comment-close'
  event: CloseEvent
}

export type CommentMessageEvent = {
  type: 'comment-message'
  message: Message
}

export type CommentErrorEvent = {
  type: 'comment-error'
  event: Event
}

export type OpenLogWindow = {
  type: 'log-window-open'
  tabId: number
}

export type TargetTab = {
  type: 'target-tab'
  status?: 'added' | 'removed'
  tabId?: number
}

export type LogWindowEvent = {
  type: 'log-window-event'
  status: 'open' | 'close'
}
