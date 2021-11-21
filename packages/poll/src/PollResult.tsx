import { ChangeEvent, PropsWithChildren, useState, useCallback, useMemo} from 'react'
import {
  Button,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup,
} from '@mui/material'
import { Bar } from 'react-chartjs-2'
import { Mode } from './types'

export type PollResultProps = {
  data: {
    labels: string[]
    datasets: {
      label?: string
      data: number[]
      backgroundColor?: string[]
      borderColor?: string[]
      borderWidth?: number[]
    }[]
  } | null
  mode: Mode
  onClosed: () => void
  onTypeChanged: (type: string) => void
}

type ResultType = 'result-list' | 'result-graph'

const barColorsBase: { r: number, g: number, b: number }[] = [
  { r: 255, g:  99, b: 132 },
  { r: 255, g: 159, b:  64 },
  { r: 255, g: 205, b:  86 },
  { r:  75, g: 192, b: 192 },
  { r:  54, g: 162, b: 235 },
  { r: 153, g: 102, b: 255 },
  { r: 201, g: 203, b: 207 },
]

type BarAttributes = {
  backgrounds: string[]
  borders: string[]
  borderWidths: number[]
}

type IndexValue = [number, number]

function calcBarAttributes(data: number[]): BarAttributes {
  const initialValue = {
    backgrounds: [],
    borders: [],
    borderWidths: [],
  }
  if (data.length === 0) {
    return initialValue
  }

  // argsort, then calculate attributes
  const argSorted: IndexValue[] = data
    .map((value, index): IndexValue => [index, value])
    .sort((a, b) => b[1] - a[1])
  const highestValue = argSorted[0][1]
  return argSorted
    .reduce((p: BarAttributes, c: IndexValue, index: number) => {
      const isHighestValue = c[1] === highestValue
      const color = barColorsBase[index % barColorsBase.length]
      const alpha = isHighestValue ? '0.4' : '0.2'
      p.backgrounds[c[0]] = `rgb(${color.r}, ${color.g}, ${color.b}, ${alpha})`
      p.borders[c[0]] = `rgb(${color.r}, ${color.g}, ${color.b})`
      p.borderWidths[c[0]] = isHighestValue ? 4 : 2
      return p
    }, initialValue)
}

function TypeSelect({ type, onChange }: {
  type: ResultType
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
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

function CloseButton({ onClosed }: { onClosed: PollResultProps['onClosed']}): JSX.Element {
  return (
    <>
      <Grid item xs={10} />
      <Grid item xs={2}>
        <Button variant="outlined" onClick={onClosed}>Close</Button>
      </Grid>
    </>
  )
}

const graphOptions = {
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

export function PollResult(
  { mode, data, onClosed, onTypeChanged, children }: PropsWithChildren<PollResultProps>
): JSX.Element | null {
  const [type, setType] = useState<ResultType>('result-list')
  const enchantedData = useMemo((): PollResultProps['data'] => {
    if (data === null || data.datasets.length === 0) {
      return null
    }
    const datasets = data.datasets[0]
    const barAttrs = calcBarAttributes(datasets.data)
    datasets.backgroundColor = barAttrs.backgrounds
    datasets.borderColor = barAttrs.borders
    datasets.borderWidth = barAttrs.borderWidths
    return data
  }, [data])
  const onChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
    const value = event.target.value
    if (value === 'result-list' || value === 'result-graph') {
      setType(value)
      onTypeChanged(value)
    }
  }, [onTypeChanged])

  if ((mode !== 'result-graph' && mode !== 'result-list') || enchantedData === null) {
    return <>{children}</>
  }
  if (mode === 'result-list') {
    return (
      <>
        <TypeSelect type={type} onChange={onChange} />
        {children}
        <CloseButton onClosed={onClosed} />
      </>
    )
  }
  return (
    <>
      <TypeSelect type={type} onChange={onChange} />
      <Grid item xs={12}>
        <Bar type="horizontalBar" data={enchantedData} options={graphOptions} />
      </Grid>
      <CloseButton onClosed={onClosed} />
    </>
  )
}
