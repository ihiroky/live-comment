import React from 'react'
import {
  makeStyles,
  Theme,
  TextField,
  Button,
  Grid
} from '@material-ui/core'
import { useAppCookies } from './useAppCookies'
import {
  getLogger
} from 'common'

interface TextFieldState {
  value: string
  helperText: string
}

const useStyles = makeStyles((theme: Theme) => (
  {
    root: {
      minWidth: '300px',
      maxWidth: '600px',
      minHeight: '300px',
      height: '600px',
      margin: 'auto',
      padding: theme.spacing(1)
    },
    notification: {
      color: theme.palette.warning.main
    },
    texts: {
      padding: theme.spacing(1)
    },
    buttons: {
      padding: theme.spacing(1)
    },
  }
))

const log = getLogger('LoginForm')

export const LoginForm: React.FC = (): JSX.Element => {
  const [cookies, modCookies] = useAppCookies()
  const [notification, setNotification] = React.useState<{ message: string }>({
    message: ''
  })
  const [room, setRoom] = React.useState<TextFieldState>({
    value: cookies.str('room') || '',
    helperText: cookies.str('room') ? '' : 'Input room name',
  })
  const [password, setPassword] = React.useState<TextFieldState>({
    value: cookies.str('password') || '',
    helperText: cookies.str('password') ? '' :'Input password of the room',
  })

  React.useEffect((): void => {
    const json = window.localStorage.getItem('App.notification')
    if (!json) {
      setNotification({ message: '' })
      return
    }
    window.localStorage.removeItem('App.notification')
    const notification = JSON.parse(json)
    setNotification(notification)
  }, [])

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    modCookies.str('room', room.value)
    modCookies.str('password', password.value)
    window.location.href = './comment'
  }

  function onTextFieldChange(e: React.ChangeEvent<HTMLInputElement>): void {
    log.trace('[onTextFieldChanged]', e.target.name, e.target.value)
    if (notification.message.length > 0) {
      setNotification({ message: '' })
    }
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
    <div className={classes.texts}>
      <div className={classes.notification}>{notification.message}</div>
      <TextField
        fullWidth
        label="Room"
        name="room"
        value={room.value}
        error={room.value.length === 0}
        helperText={room.helperText}
        margin="normal"
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
        margin="normal"
        onChange={onTextFieldChange}
      />
    </div>
    <div className={classes.buttons}>
      <Grid container alignItems="center" justify="center">
        <Grid item>
          <Button variant="outlined" type="submit" disabled={hasError()}>Enter</Button>
        </Grid>
      </Grid>
    </div>
  </form>
}
