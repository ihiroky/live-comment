import React from 'react'
import {
  Button,
  Grid,
} from '@material-ui/core'
import { Entry, Mode } from './types'

export function Choice({ entries, mode, descClass, onRemoveEntry }: {
  entries: Entry[]
  mode: Mode
  descClass: string
  onRemoveEntry: (index: number) => void
}): JSX.Element | null {
  if (mode === 'result-graph') {
    return null
  }

  // TODO Emphasize top result
  return (
    <>
      {entries.map((entry: Entry, index: number): JSX.Element => (
        <Grid item xs={12} key={entry.key}>
          <Grid container>
            <Grid item xs={1} />
            <Grid item xs={1}>{index + 1}</Grid>
            <Grid item xs={8} className={descClass}>{entry.description}</Grid>
            <Grid item xs={1}>
              {
                mode === 'edit'
                  ? <Button variant="outlined" onClick={() => onRemoveEntry(index)}>Del</Button>
                  : null
              }
              {
                mode === 'result-list'
                  ? <div>{entry.count}</div>
                  : null
              }
            </Grid>
            <Grid item xs={1} />
          </Grid>
        </Grid>
      ))}
    </>
  )
}
