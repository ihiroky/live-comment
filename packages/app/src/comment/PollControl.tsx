import { FC, useCallback, useState } from 'react'
import { styled } from '@mui/system'
import { PollEntry } from '@/poll/types'
import { Button } from '@mui/material'
import { AppState } from './types'

type PollControlProps = {
  poll: AppState['polls'][number]
  onPoll: (e: React.MouseEvent<HTMLButtonElement>, choice: PollEntry['key'], owner: string) => void
  onClosePoll: (pollId: string) => void
}

const PollDiv = styled('div')({
  marginLeft: '10%',
  marginRight: '10%',
})

const PollListDiv = styled('div')({
  textAlign: 'left',
})

const PollButtonDiv = styled('div')({
  textAlign: 'right',
})

export const PollControl: FC<PollControlProps> = (
  { poll, onPoll, onClosePoll }: PollControlProps
): JSX.Element => {
  const [selected, setSelected] = useState(0)
  const onChoice = useCallback(
    (ev: React.MouseEvent<HTMLButtonElement>, key: PollEntry['key'], owner: string) => {
      setSelected(key)
      onPoll(ev, key, owner)
    },
    [onPoll]
  )
  return (
    <div className="message">
      <div role="status">Presenter starts a poll! [id:{poll.id}] Click the number you choose.</div>
      <h3 style={{ padding: '8px' }}>{poll.title}</h3>
      <PollDiv>
        <PollListDiv role="list">
          {
            poll.entries.map((e: Pick<PollEntry, 'key' | 'description'>, i: number) => (
              <div key={`poll-${poll.key}-${e.key}`} role="listitem">
                <Button
                  variant={e.key === selected ? 'contained' : 'outlined'}
                  onClick={(ev): void => onChoice(ev, e.key, poll.owner)}>
                  {i + 1}
                </Button>
                <span style={{ marginLeft: '8px' }}>{e.description}</span>
              </div>
            ))
          }
        </PollListDiv>
        <PollButtonDiv>
          <Button
            variant="outlined"
            style={{ marginTop: '4px' }}
            onClick={(): void => onClosePoll(poll.id)}
          >
            Close
          </Button>
        </PollButtonDiv>
      </PollDiv>
    </div>
  )
}
