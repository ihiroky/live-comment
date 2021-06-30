import React from 'react'
import {
  Grid,
  Button
} from '@material-ui/core'
import { Mode } from './types'


export function Polling({ mode, onFinished }: {
  mode: Mode
  onFinished: () => void
}): JSX.Element | null {
  if (mode !== 'poll') {
    return null
  }

  return (
    <>
      <Grid item xs={10} />
      <Grid item xs={2}>
        <Button onClick={onFinished}>Finish</Button>
      </Grid>
    </>
  )
}
