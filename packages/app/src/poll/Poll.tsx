import { FC, useState, useCallback, useEffect } from 'react'
import { Grid, Paper, InputBase } from '@mui/material'
import { styled } from '@mui/system'
import { getLogger } from '@/common/Logger'
import { createRandomString, getRandomInteger } from '@/common/utils'
import { Mode, Update, PollEntry } from './types'
import { Choice } from './Choice'
import { PollEdit } from './PollEdit'
import { Polling } from './Polling'
import { PollResult, PollResultProps } from './PollResult'
import { ReconnectableWebSocket } from '@/wscomp/rws'

const log = getLogger('Poll')

type Props = {
  title: string
  room: string
  hash: string
  rws: ReconnectableWebSocket | null
  onCreated?: () => void
  onCanceled?: () => void
  onPollClosed?: () => void
  onResultClosed?: () => void
}

const RootDiv = styled('div')({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
})

const UiPaper = styled(Paper)({
  width: '800px',
  padding: '16px',
  overflowWrap: 'normal',
})

const StyledInputBase = styled(InputBase)({
  width: '100%',
  paddingBottom: '8px',
  fontSize: '32px',
  fontWeight: 'bolder',
})

function ChoiceClassStyle({ descClassName, topClassName}: {
  descClassName: string
  topClassName: string
}): JSX.Element {
  const css =
`.${descClassName} {
  width: 100%;
  fontSize: 24px;
  overflowWrap: break-word;
}
.${topClassName} {
  fontWeight: bold;
}`
  return <style>${css}</style>
}

export const Poll: FC<Props> = (props: Props): JSX.Element => {
  const [title, setTitle] = useState<string>(props.title)
  const [entries, setEntries] = useState<PollEntry[]>([])
  const [mode, setMode] = useState<Mode>('edit')
  const [data, setData] = useState<PollResultProps['data']>(null)

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
      labels: entries.map(e => e.description),
      datasets: [{
        data: entries.map(e => e.count),
      }]
    }
    setData(newData)
  }, [entries, title])

  const rn = createRandomString(6)
  const descClassName = 'description-' + rn
  const topClassName = 'top-' + rn
  return (
    <RootDiv>
      <ChoiceClassStyle descClassName={descClassName} topClassName={topClassName} />
      <UiPaper elevation={3}>
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <StyledInputBase
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
              descClass={descClassName}
              topClass={topClassName}
              entries={entries}
              onRemoveEntry={onRemoveEntry}
            />
          </PollResult>
          <PollEdit
            mode={mode}
            descClass={descClassName}
            entryCount={entries.length}
            onEntryAdded={onEntryAdded}
            onOk={onOk}
            onCanceled={onCanceled}
          />
          {
            mode === 'poll'
              ? (
                <Polling
                  room={props.room}
                  hash={props.hash}
                  title={title}
                  entries={entries}
                  rws={props.rws}
                  onChange={onEntryUpdated}
                  onFinished={onFinished}
                />
              )
              : null
          }
        </Grid>
      </UiPaper>
    </RootDiv>
  )
}
