import React from 'react'
import {
  Button,
  Grid,
  Paper,
} from '@material-ui/core'
import { WebSocketControl } from 'common'
import { PollEntry, PollMessage } from './types'
import { usePollStyles } from './usePollStyle'

type Props = {
  title: string
  entries: PollEntry[]
  send: WebSocketControl['send']
}

export const Poll: React.FC<Props> = ({ title, entries, send }: Props): JSX.Element => {
  const classes = usePollStyles()
  const onPoll = React.useCallback((choice: number): void => {
    const poll: PollMessage = {
      type: 'app',
      cmd: 'poll/poll',
      choice,
    }
    send(poll)
  }, [send])

  return (
    <div className={classes.root}>
      <Paper className={classes.ui} elevation={3}>
        <Grid container spacing={1}>
          <Grid item xs={12} className={classes.title}>{title}</Grid>
          {entries.map((entry: PollEntry, index: number): JSX.Element => (
            <Grid item xs={12} key={entry.key}>
              <Grid container>
                <Grid item xs={1} />
                <Grid item xs={1}>{index + 1}</Grid>
                <Grid item xs={8} className={classes.description}>{entry.description}</Grid>
                <Grid item xs={1}>
                  <Button variant="outlined" onClick={() => onPoll(index)}>Poll!</Button>
                </Grid>
                <Grid item xs={1} />
              </Grid>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </div>
  )
}