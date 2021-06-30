import React from 'react'
import {
  Button,
  Grid,
  TextField,
} from '@material-ui/core'
import { Mode } from './types'

export function PollEdit({ mode, onEntryAdded, onOk, onCanceled }: {
  mode: Mode
  onEntryAdded: (description: string) => void
  onOk: () => void
  onCanceled: () => void
}): JSX.Element | null {
  const [description, setDescription] = React.useState<string>('')

  function onClick(): void {
    onEntryAdded(description)
    setDescription('')
  }

  if (mode !== 'edit') {
    return null
  }

  return (
    <>
      <Grid item xs={1} />
      <Grid item xs={1}>-</Grid>
      <Grid item xs={8}>
        <TextField style={{width: '100%'}} value={description} onChange={e => setDescription(e.target.value)}/>
      </Grid>
      <Grid item xs={1}>
        <Button onClick={onClick}>Add</Button>
      </Grid>
      <Grid item xs={1} />
      <Grid item xs={8}></Grid>
      <Grid item xs={2}>
        <Button onClick={onOk}>OK</Button>
      </Grid>
      <Grid item xs={2}>
        <Button onClick={onCanceled}>Cancel</Button>
      </Grid>
    </>
  )
}
