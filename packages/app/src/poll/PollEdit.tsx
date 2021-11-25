import { useState } from 'react'
import {
  Button,
  Grid,
  TextField,
} from '@mui/material'
import { Mode } from './types'

export function PollEdit({ mode, descClass, entryCount, onEntryAdded, onOk, onCanceled }: {
  mode: Mode
  descClass: string
  entryCount: number
  onEntryAdded: (description: string) => void
  onOk: () => void
  onCanceled: () => void
}): JSX.Element | null {
  const [description, setDescription] = useState<string>('')

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
        <TextField
          InputProps={{
            classes: {
              input: descClass
            }
          }}
          style={{width: '100%'}}
          multiline
          placeholder="Write a new entry description."
          value={description}
          onChange={(e): void => setDescription(e.target.value)}
        />
      </Grid>
      <Grid item xs={1}>
        <Button variant="outlined" onClick={onClick} disabled={description.length === 0}>Add</Button>
      </Grid>
      <Grid item xs={1} />
      <Grid item xs={8}></Grid>
      <Grid item xs={2}>
        <Button variant="outlined" onClick={onOk} disabled={entryCount === 0}>OK</Button>
      </Grid>
      <Grid item xs={2}>
        <Button variant="outlined" onClick={onCanceled}>Cancel</Button>
      </Grid>
    </>
  )
}
