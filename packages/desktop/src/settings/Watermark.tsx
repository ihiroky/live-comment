import React from 'react'
import {
  makeStyles,
  Theme,
  Grid,
  Button
} from '@material-ui/core'

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    width: '80vw',
    height: '80vh',
    margin: 'auto',
    padding: theme.spacing(3)
  },
  buttons: {
    marginTop: theme.spacing(3),
  },
}))

export const Watermark: React.FC = (): JSX.Element => {

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    window.close()
  }

  function hasError(): boolean {
    return false
  }

  const classes = useStyles()

  return (
    <form className={classes.root} onSubmit={onSubmit}>
      <div>Watermark</div>
      <div className={classes.buttons}>
        <Grid container alignItems="center" justify="center" spacing={3}>
          <Grid item>
            <Button variant="outlined" type="submit" disabled={hasError()}>OK</Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" onClick={() => window.close()}>Cancel</Button>
          </Grid>
        </Grid>
      </div>
    </form>
  )
}