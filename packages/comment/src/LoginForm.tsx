import React from 'react'
import {
  makeStyles,
  Theme,
  TextField,
  Button,
  Grid
} from '@material-ui/core'
import {
  AcnMessage,
  createHash,
  fetchWithTimeout,
  getLogger,
  isAcnOkMessage,
  isErrorMessage,
  Message
} from 'common'
import { gotoCommentPage } from './utils'

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

export const LoginForm: React.FC<{ apiUrl: string}> = ({ apiUrl } : { apiUrl: string }): JSX.Element => {
  const [notification, setNotification] = React.useState<{ message: string }>({
    message: ''
  })
  const [room, setRoom] = React.useState<TextFieldState>({
    value: '',
    helperText: 'Input room name',
  })
  const [password, setPassword] = React.useState<TextFieldState>({
    value: '',
    helperText: 'Input password of the room',
  })

  React.useEffect((): void => {
    const token = window.localStorage.getItem('token')
    if (token) {
      gotoCommentPage()
      return
    }
    const json = window.localStorage.getItem('App.notification')
    if (!json) {
      setNotification({ message: '' })
      return
    }
    window.localStorage.removeItem('App.notification')
    const notification = JSON.parse(json)
    setNotification(notification)
  }, [])

  const onSubmit = React.useCallback((e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    const message: AcnMessage = {
      type: 'acn',
      room: room.value,
      hash: createHash(password.value)
    }
    fetchWithTimeout(
      `${apiUrl}/login`,
      {
        method: 'POST',
        cache: 'no-store',
        mode: 'cors',
        body: JSON.stringify(message)
      },
      3000
    ).then((res: Response): Promise<Message> =>
      res.ok
        ? res.json()
        : Promise.resolve({ type: 'error', error: 'ERROR', message: 'Fetch failed' })
    ).then((m: Message): void => {
      if (isAcnOkMessage(m)) {
        localStorage.setItem('token', m.attrs.token)
        gotoCommentPage()
        return
      }
      setNotification({ message: `Login failed (${ isErrorMessage(m) ? m.message : JSON.stringify(m)})` })
    })
  }, [apiUrl, room.value, password.value])

  const onTextFieldChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    log.debug('[onTextFieldChanged]', e.target.name, e.target.value)
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
  }, [notification.message.length])

  const hasError = React.useCallback((): boolean => {
    return room.helperText.length > 0 || password.helperText.length > 0
  }, [room.helperText, password.helperText])

  const classes = useStyles()
  return <form className={classes.root} onSubmit={onSubmit}>
    <div className={classes.texts}>
      <div role="status" className={classes.notification}>{notification.message}</div>
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
