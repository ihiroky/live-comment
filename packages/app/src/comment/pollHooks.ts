import * as React from 'react'
import { getLogger } from '@/common/Logger'
import { ReconnectableWebSocket } from '@/wscomp/rws'
import { PollEntry, PollMessage } from '@/poll/types'
import { AppState } from './types'
import { PollControl } from './PollControl'

const log = getLogger('onPoll')

export function useOnPoll(
  rws: ReconnectableWebSocket | null,
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
    rws?.send(message)
  }, [rws])
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
