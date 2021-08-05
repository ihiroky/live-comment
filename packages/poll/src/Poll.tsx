import React from 'react'
import {
  Grid,
  Paper,
  InputBase,
  makeStyles,
} from '@material-ui/core'
import { getLogger } from 'common'
import { Mode, Update, PollEntry } from './types'
import { Choice } from './Choice'
import { PollEdit } from './PollEdit'
import { Polling } from './Polling'
import { PollResult, PollResultProps } from './PollResult'
import { getRandomInteger } from './utils'

const log = getLogger('Poll')

type Props = {
  title: string
  wsUrl: string
  room: string
  hash: string
  onCreated?: () => void
  onCanceled?: () => void
  onPollClosed?: () => void
  onResultClosed?: () => void
}

const usePollStyles = makeStyles(() => ({
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
    fontWeight: 'bolder',
  },
  description: {
    width: '100%',
    fontSize: '24px',
  },
}))

export const Poll: React.FC<Props> = (props: Props): JSX.Element => {
  const [title, setTitle] = React.useState<string>(props.title)
  const [entries, setEntries] = React.useState<PollEntry[]>([])
  const [mode, setMode] = React.useState<Mode>('edit')
  const [data, setData] = React.useState<PollResultProps['data']>(null)
  const classes = usePollStyles()

  const onRemoveEntry = React.useCallback((index: number): void => {
    entries.splice(index, 1)
    setEntries([...entries])
  }, [entries])
  const onEntryAdded = React.useCallback((description: string): void => {
    const newEntries = entries.concat({
      key: getRandomInteger(),
      description,
      count: 0,
    })
    setEntries(newEntries)
  }, [entries])
  const onEntryUpdated = React.useCallback((update: Update): void => {
    for (const [key, diff] of update.entries()) {
      const entry = entries.find(e => e.key === key)
      if (entry) {
        entry.count += diff
      } else {
        log.debug('[onEntryUpdate] Unexpected entry key:', key)
      }
    }
    setEntries([...entries])
  }, [entries])
  const onOk = React.useCallback((): void => {
    // TODO Check if data exists.
    setMode('poll')
    props.onCreated && props.onCreated()
  }, [props.onCreated])
  const onCanceled = React.useCallback((): void => {
    props.onCanceled && props.onCanceled()
  }, [props.onCanceled])
  const onFinished = React.useCallback((): void => {
    setMode('result-list')
    props.onPollClosed && props.onPollClosed()
  }, [props.onPollClosed])
  const onClosed = React.useCallback((): void => {
    props.onResultClosed && props.onResultClosed()
  }, [props.onResultClosed])

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
              placeholder="Poll title"
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
          <Polling
            mode={mode}
            url={props.wsUrl}
            room={props.room}
            hash={props.hash}
            title={title}
            entries={entries}
            onChange={onEntryUpdated}
            onFinished={onFinished}
          />
        </Grid>
      </Paper>
    </div>
  )
}
