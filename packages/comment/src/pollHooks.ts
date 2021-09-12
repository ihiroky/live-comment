import React from 'react'
import { getLogger } from 'common'
import { WebSocketControl } from 'wscomp'
import { PollEntry, PollMessage } from 'poll'
import { AppState } from './types'
import { PollControl } from './PollControl'

const log = getLogger('onPoll')

export function useOnPoll(
  wscRef: React.MutableRefObject<WebSocketControl | null>
): React.ComponentProps<typeof PollControl>['onPoll'] {
  return React.useCallback((e: React.MouseEvent<HTMLButtonElement>, choice: PollEntry['key'], to: string): void => {
    e.preventDefault()
    const message: PollMessage = {
      type: 'app',
      cmd: 'poll/poll',
      to,
      choice,
    }
    log.debug('[onPoll] ', message)
    wscRef.current?.send(message)
  }, [wscRef])
}

export function useOnClosePoll(
  state: AppState, setState: (state: AppState) => void
): (pollId: string, refresh: boolean) => void {
  return React.useCallback((pollId: string, refresh: boolean): void => {
    const polls = state.polls
    const dropIndex = polls.findIndex(poll => poll.id === pollId)
    if (dropIndex > -1) {
      polls.splice(dropIndex, 1)
      if (refresh) {
        setState({...state, polls})
      }
    }
  }, [state, setState])
}
