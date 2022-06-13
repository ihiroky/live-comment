import { FC, useCallback, useState } from 'react'
import makeStyles from '@mui/styles/makeStyles'
import { PollEntry } from '@/poll/types'
import { Button } from '@mui/material'
import { AppState } from './types'

type PollControlProps = {
  poll: AppState['polls'][number]
  onPoll: (e: React.MouseEvent<HTMLButtonElement>, choice: PollEntry['key'], owner: string) => void
  onClosePoll: (pollId: string) => void
}

const useStyles = makeStyles({
  poll: {
    marginLeft: '10%',
    marginRight: '10%',
  },
  pollList: {
    textAlign: 'left',
  },
  pollButton: {
    textAlign: 'right',
  }
})

export const PollControl: FC<PollControlProps> = (
  { poll, onPoll, onClosePoll }: PollControlProps
): JSX.Element => {
  const style = useStyles()
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
      <div className={style.poll}>
        <div role="list" className={style.pollList}>
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
        </div>
        <div className={style.pollButton}>
          <Button
            variant="outlined"
            style={{ marginTop: '4px' }}
            onClick={(): void => onClosePoll(poll.id)}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
