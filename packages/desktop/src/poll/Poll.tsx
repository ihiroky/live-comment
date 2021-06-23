import React from 'react'
import {
  Button,
  Grid,
  Paper,
  TextField,
  makeStyles,
} from '@material-ui/core'
import { Bar } from 'react-chartjs-2'

type EditProps = {
  onEntryAdded(description: string): void
  onOk(): void
  onCanceled(): void
}

function PollEdit(props: EditProps): JSX.Element {
  const [description, setDescription] = React.useState<string>('')

  function onEntryAdded(): void {
    props.onEntryAdded(description)
    setDescription('')
  }

  const textFieldStyle: React.CSSProperties = {
    width: '100%'
  }

  return (
    <>
      <Grid item xs={1} />
      <Grid item xs={1}>-</Grid>
      <Grid item xs={8}>
        <TextField style={textFieldStyle} value={description} onChange={e => setDescription(e.target.value)}/>
      </Grid>
      <Grid item xs={1}>
        <Button onClick={onEntryAdded}>Add</Button>
      </Grid>
      <Grid item xs={1} />
      <Grid item xs={8}></Grid>
      <Grid item xs={2}>
        <Button onClick={props.onOk}>OK</Button>
      </Grid>
      <Grid item xs={2}>
        <Button onClick={props.onCanceled}>Cancel</Button>
      </Grid>
    </>
  )
}

type PollingProps = {
  onFinished(): void
}

function Polling(props: PollingProps): JSX.Element {
  return (
    <>
      <Grid item xs={10} />
      <Grid item xs={2}>
        <Button onClick={props.onFinished}>Finish</Button>
      </Grid>
    </>
  )
}

type ResultProps = {
  data: {
    labels: string[]
    datasets: [{
      label: '# of Votes'
      data: number[]
      /*
      backgroundColor: string[]
      borderColor: string[]
      borderWidth: number
      */
    }]
  }
  onClosed(): void
}

function PollResult(props: ResultProps): JSX.Element {
  const options = {
    indexAxis: 'y',
    elements: {
      bar: {
        borderWidth: 2,
      },
    },
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
      title: {
        display: true,
        text: 'Chart.js Horizontal Bar Chart',
      },
    },
  }

  return (
    <>
      <Grid item xs={12}>
        <Bar type="bar" data={props.data} options={options} />
      </Grid>
      <Grid item xs={10} />
      <Grid item xs={2}>
        <Button onClick={props.onClosed}>Close</Button>
      </Grid>
    </>
  )
}

const useStyles = makeStyles(() => ({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ui: {
    width: '800px',
  },
}))

type Props = {
  title: string
  onCreated?: () => void
  onCanceled?: () => void
  onPollClosed?: () => void
  onResultClosed?: () => void
}

type Entry ={
  key: number
  description: string
}

const Modes = [
  'edit',
  'poll',
  'result',
] as const
type Mode = typeof Modes[number]

export const Poll: React.FC<Props> = (props: Props): JSX.Element => {
  const [entries, setEntries] = React.useState<Entry[]>([])
  const [mode, setMode] = React.useState<Mode>('edit')
  const classes = useStyles()

  function onRemoveEntry(index: number): void {
    entries.splice(index, 1)
    setEntries([...entries])
  }

  function onEntryAdded(description: string): void {
    const newEntries = entries.concat({
      key: Date.now(),
      description
    })
    setEntries(newEntries)
  }

  function onOk(): void {
    setMode('poll')
    props.onCreated && props.onCreated()
  }

  function onCanceled(): void {
    props.onCanceled && props.onCanceled()
  }

  function onFinished(): void {
    setMode('result')
    props.onPollClosed && props.onPollClosed()
  }

  function onClosed(): void {
    props.onResultClosed && props.onResultClosed()
  }

  const data: ResultProps['data'] = {
    labels: ['1', '2', '3', '4'],
    datasets: [{
      label: '# of Votes',
      data: [1, 2, 3, 4],
    }]
  }

  return (
    <div className={classes.root}>
      <Paper className={classes.ui} elevation={3}>
        <Grid container spacing={3}>
          {/* TODO Editable */}
          <Grid item xs={12}>{props.title}</Grid>
          {
            entries.map((entry: Entry, index: number): JSX.Element => (
              <Grid item xs={12} key={entry.key}>
                <Grid container>
                  <Grid item xs={1} />
                  <Grid item xs={1}>{index + 1}</Grid>
                  <Grid item xs={8}>{entry.description}</Grid>
                  <Grid item xs={1}>
                    <Button onClick={() => onRemoveEntry(index)}>Del</Button>
                  </Grid>
                  <Grid item xs={1} />
                </Grid>
              </Grid>
            ))
          }
          {
            mode === 'edit'
              ? <PollEdit onEntryAdded={onEntryAdded} onOk={onOk} onCanceled={onCanceled} />
              : null
          }
          {
            mode === 'poll'
              ? <Polling onFinished={onFinished} />
              : null
          }
          {
            mode === 'result'
              ? <PollResult data={data} onClosed={onClosed} />
              : null
          }
        </Grid>
      </Paper>
    </div>
  )
}