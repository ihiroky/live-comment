import { FC, useState, useCallback, useEffect } from 'react'
import { Grid, Paper, InputBase } from '@mui/material'
import makeStyles from '@mui/styles/makeStyles'
import { getLogger, getRandomInteger } from 'common'
import { Mode, Update, PollEntry } from './types'
import { Choice } from './Choice'
import { PollEdit } from './PollEdit'
import { Polling } from './Polling'
import { PollResult, PollResultProps } from './PollResult'

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
    padding: '16px',
    overflowWrap: 'normal',
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
    overflowWrap: 'break-word',
  },
  top: {
    fontWeight: 'bold'
  }
}))

export const Poll: FC<Props> = (props: Props): JSX.Element => {
  const [title, setTitle] = useState<string>(props.title)
  const [entries, setEntries] = useState<PollEntry[]>([])
  const [mode, setMode] = useState<Mode>('edit')
  const [data, setData] = useState<PollResultProps['data']>(null)
  const classes = usePollStyles()

  const onRemoveEntry = useCallback((index: number): void => {
    entries.splice(index, 1)
    setEntries([...entries])
  }, [entries])
  const onEntryAdded = useCallback((description: string): void => {
    const newEntries = entries.concat({
      key: getRandomInteger(),
      description,
      count: 0,
    })
    setEntries(newEntries)
  }, [entries])
  const onEntryUpdated = useCallback((update: Update): void => {
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
  const onOk = useCallback((): void => {
    // TODO Check if data exists.
    setMode('poll')
    props.onCreated && props.onCreated()
  }, [props])
  const onCanceled = useCallback((): void => {
    props.onCanceled && props.onCanceled()
  }, [props])
  const onFinished = useCallback((): void => {
    setMode('result-list')
    props.onPollClosed && props.onPollClosed()
  }, [props])
  const onClosed = useCallback((): void => {
    props.onResultClosed && props.onResultClosed()
  }, [props])

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

  useEffect((): void => {
    const newData: PollResultProps['data'] = {
      labels: entries.map((e, i) => String(i + 1)),
      datasets: [{
        data: entries.map(e => e.count),
      }]
    }
    setData(newData)
  }, [entries, title])

  return (
    <div className={classes.root}>
      <Paper className={classes.ui} elevation={3}>
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <InputBase
              className={classes.title}
              autoFocus
              multiline
              readOnly={mode !== 'edit'}
              value={title}
              placeholder="Input title."
              onChange={(e): void => setTitle(e.target.value)}
            />
          </Grid>
          <PollResult mode={mode} data={data} onClosed={onClosed} onTypeChanged={onResultTypeChanged}>
            <Choice
              mode={mode}
              descClass={classes.description}
              topClass={classes.top}
              entries={entries}
              onRemoveEntry={onRemoveEntry}
            />
          </PollResult>
          <PollEdit
            mode={mode}
            descClass={classes.description}
            entryCount={entries.length}
            onEntryAdded={onEntryAdded}
            onOk={onOk}
            onCanceled={onCanceled}
          />
          {
            mode === 'poll'
              ? (
                <Polling
                  url={props.wsUrl}
                  room={props.room}
                  hash={props.hash}
                  title={title}
                  entries={entries}
                  onChange={onEntryUpdated}
                  onFinished={onFinished}
                />
              )
              : null
          }
        </Grid>
      </Paper>
    </div>
  )
}
