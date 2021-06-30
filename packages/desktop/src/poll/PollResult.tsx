import React from 'react'
import {
  Button,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup,
} from '@material-ui/core'
import { Bar } from 'react-chartjs-2'
import { Mode } from './types'

export type PollResultProps = {
  data: {
    labels: string[]
    datasets: [{
      label: string
      data: number[]
      /*
      backgroundColor: string[]
      borderColor: string[]
      borderWidth: number
      */
    }]
  } | null
  mode: Mode
  onClosed: () => void
  onTypeChanged: (type: string) => void
}

export function PollResult({ mode, data, onClosed, onTypeChanged }: PollResultProps): JSX.Element | null {
  const options = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: {
        display: false
     },
      title: {
        display: false,
      },
    },
  }
  const [type, setType] = React.useState<string>('list')
  function onChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const value = event.target.value
    setType(value)
    onTypeChanged(value)
  }

  function TypeSelect({ type, onChange }: {
    type: string
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  }): JSX.Element {
    return (
      <Grid item xs={12}>
        <RadioGroup row aria-label="result" name="poll_result" defaultValue={type} value={type} onChange={onChange}>
          <FormControlLabel value="result-list" control={<Radio />} label="List" />
          <FormControlLabel value="result-graph" control={<Radio />} label="Graph" />
        </RadioGroup>
      </Grid>
    )
  }

  if ((mode !== 'result-graph' && mode !== 'result-list') || data === null) {
    return null
  }
  if (mode === 'result-list') {
    return <TypeSelect type={type} onChange={onChange} />
  }
  return (
    <>
      <TypeSelect type={type} onChange={onChange} />
      <Grid item xs={12}>
        <Bar type="horizontalBar" data={data} options={options} />
      </Grid>
      <Grid item xs={10} />
      <Grid item xs={2}>
        <Button onClick={onClosed}>Close</Button>
      </Grid>
    </>
  )
}
