import React from 'react'
import {
  Grid,
  Paper,
  makeStyles,
  InputBase,
} from '@material-ui/core'
import { getLogger } from 'common'
import { Entry, Mode } from './types'
import { Choice } from './Choice'
import { PollEdit } from './PollEdit'
import { Polling } from './Polling'
import { PollResult, PollResultProps } from './PollResult'

const log = getLogger('Poll')

const useStyles = makeStyles(() => ({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ui: {
    width: '800px',
    padding: '8px'
  },
  title: {
    width: '100%',
    paddingBottom: '8px',
    fontSize: '32px',
    fontWeight: 'bold',
  },
  description: {
    width: '100%',
    fontSize: '24px',
    fontWeight: 'bolder',
  },
}))

type Props = {
  title: string
  onCreated?: () => void
  onCanceled?: () => void
  onPollClosed?: () => void
  onResultClosed?: () => void
}

export const Poll: React.FC<Props> = (props: Props): JSX.Element => {
  const [title, setTitle] = React.useState<string>(props.title)
  const [entries, setEntries] = React.useState<Entry[]>([])
  const [mode, setMode] = React.useState<Mode>('edit')
  const [data, setData] = React.useState<PollResultProps['data']>(null)
  const classes = useStyles()

  function onRemoveEntry(index: number): void {
    entries.splice(index, 1)
    setEntries([...entries])
  }

  function onEntryAdded(description: string): void {
    const newEntries = entries.concat({
      key: Date.now(),
      description,
      count: Math.round(10 * Math.random()),
    })
    setEntries(newEntries)
  }

  function onOk(): void {
    // TODO Check if data exists.
    setMode('poll')
    props.onCreated && props.onCreated()
  }

  function onCanceled(): void {
    props.onCanceled && props.onCanceled()
  }

  function onFinished(): void {
    setMode('result-list')
    props.onPollClosed && props.onPollClosed()
  }

  function onClosed(): void {
    props.onResultClosed && props.onResultClosed()
  }

  function onResultTypeChanged(type: string): void {
    switch (type) {
      case 'result-list':
      case 'result-graph':
        setMode(type)
        break
      default:
        log.error('Unexpected result type:', type)
        break
    }
  }

  React.useEffect((): void => {
    const newData: PollResultProps['data'] = {
      labels: entries.map((_, i) => String(i + 1)),
      datasets: [{
        label: '# of votes',
        data: entries.map(e => e.count),
      }]
    }
    setData(newData)
  }, [entries])

  return (
    <div className={classes.root}>
      <Paper className={classes.ui} elevation={3}>
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <InputBase
              className={classes.title}
              autoFocus
              readOnly={mode !== 'edit'}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </Grid>
          <PollResult mode={mode} data={data} onClosed={onClosed} onTypeChanged={onResultTypeChanged}>
            <Choice
              mode={mode}
              descClass={classes.description}
              entries={entries}
              onRemoveEntry={onRemoveEntry}
            />
          </PollResult>
          <PollEdit
            mode={mode}
            descClass={classes.description}
            onEntryAdded={onEntryAdded}
            onOk={onOk}
            onCanceled={onCanceled}
          />
          <Polling mode={mode} onFinished={onFinished} />
        </Grid>
      </Paper>
    </div>
  )
}
