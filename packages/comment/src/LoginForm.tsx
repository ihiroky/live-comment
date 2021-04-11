import React from 'react'
import {
  makeStyles,
  Theme,
  TextField,
  Button,
  Grid
} from '@material-ui/core'
import { createHash } from 'common'

interface TextFieldState {
  value: string,
  helperText: string
}

const useStyles = makeStyles((theme: Theme) => (
  {
    root: {
      width: '100vw',
      height: '100vh',
      padding: theme.spacing(3)
    }
  }
))

export const LoginForm: React.FC = (): JSX.Element => {
  const [room, setRoom] = React.useState<TextFieldState>({
    value: '',
    helperText: ''
  })
  const [password, setPassword] = React.useState<TextFieldState>({
    value: '',
    helperText: ''
  })

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    const json = JSON.stringify({
      room: room.value,
      hash: createHash(password.value)
    })
    window.localStorage.setItem('login', json)
    window.location.href = './comment'
  }

  function onTextFieldChange(e: React.ChangeEvent<HTMLInputElement>): void {
    console.log(e.target.name, e.target.value)
    switch (e.target.name) {
      case 'room': {
        const error = e.target.value.length === 0
        setRoom({
          value: e.target.value,
          helperText: error ? 'Input room name.' : ''
        })
        break
      }
      case 'password': {
        const error = e.target.value.length === 0
        setPassword({
          value: e.target.value,
          helperText: error ? 'Input password' : ''
        })
        break
      }
    }
  }

  function hasError(): boolean {
    return room.helperText.length > 0 || password.helperText.length > 0
  }

  const classes = useStyles()
  return <form className={classes.root} onSubmit={onSubmit}>
    <div>
      <TextField
        fullWidth
        label="Room"
        name="room"
        value={room.value}
        error={room.value.length === 0}
        helperText={room.helperText}
        onChange={onTextFieldChange}
      />
      <TextField
        fullWidth
        label="Password"
        type="password"
        name="password"
        value={password.value}
        error={password.value.length === 0}
        helperText={password.helperText}
        onChange={onTextFieldChange}
      />
    </div>
    <div>
      <Grid container alignItems="center" justify="center" spacing={3}>
        <Grid item>
          <Button variant="outlined" type="submit" disabled={hasError()}>Enter</Button>
        </Grid>
      </Grid>
    </div>
  </form>
}
