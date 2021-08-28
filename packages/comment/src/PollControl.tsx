
import React from 'react'
import { PollEntry } from 'poll'
import { Button } from '@material-ui/core'
import { AppState } from './types'

type PollControlProps = {
  poll: AppState['polls'][number]
  onPoll: (e: React.MouseEvent<HTMLButtonElement>, choice: PollEntry['key'], owner: string) => void
  onClosePoll: (pollId: string) => void
}

export const PollControl: React.FC<PollControlProps> = ({ poll, onPoll, onClosePoll }: PollControlProps): JSX.Element => {
  return (
    <div className="message">
      <div role="status">Presenter starts a poll!!! [id:{poll.id}] Click the number you choose.</div>
      <h3 style={{ padding: '8px' }}>{poll.title}</h3>
      <div role="list">
        {
          poll.entries.map((e: Pick<PollEntry, 'key' | 'description'>, i: number) => (
            <div key={`poll-${poll.key}-${e.key}`} role="listitem">
              <Button variant="outlined" onClick={(ev): void => onPoll(ev, e.key, poll.owner)}>{i + 1}</Button>
              <span style={{ marginLeft: '8px' }}>{e.description}</span>
            </div>
          ))
        }
      </div>
      <div>
        <Button
          variant="outlined"
          style={{ marginTop: '4px' }}
          onClick={(): void => onClosePoll(poll.id)}
        >
          Close
        </Button>
      </div>
    </div>
  )
}
