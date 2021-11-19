import React from 'react'
import { TextField, Button, Grid } from '@mui/material'
import makeStyles from '@mui/styles/makeStyles'
import {
  AcnMessage,
  createHash,
  fetchWithTimeout,
  getLogger,
  isAcnOkMessage,
  isErrorMessage,
  Message
} from 'common'
import { gotoCommentPage } from './utils/pages'
import { LabeledCheckbox } from './LabeledCheckbox'

interface TextFieldState {
  value: string
  helperText: string
}

const useStyles = makeStyles({
  root: {
    minWidth: '300px',
    maxWidth: '600px',
    minHeight: '300px',
    height: '600px',
    margin: 'auto',
    padding: '8px'
  },
  notification: {
    color: 'red'
  },
  texts: {
    padding: '8px'
  },
  options: {
    padding: '8px'
  },
  buttons: {
    padding: '8px'
  },
})

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
  const [keepLogin, setKeepLogin] = React.useState<boolean>(false)

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
      longLife: keepLogin,
      hash: createHash(password.value)
    }
    fetchWithTimeout(
      `${apiUrl.replace(/\/+$/, '')}/login`,
      {
        method: 'POST',
        cache: 'no-store',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      },
      3000
    ).then((res: Response): Promise<Message> =>
      res.ok
        ? res.json()
        : Promise.resolve({ type: 'error', error: 'ERROR', message: 'Fetch failed' })
    ).then((m: Message): void => {
      // TODO stay login if token is invalid
      if (isAcnOkMessage(m)) {
        window.localStorage.setItem('token', m.attrs.token)
        gotoCommentPage()
        return
      }
      setNotification({ message: `Login failed (${ isErrorMessage(m) ? m.message : JSON.stringify(m)})` })
    })
  }, [apiUrl, room.value, password.value, keepLogin])

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
  return (
    <form className={classes.root} onSubmit={onSubmit}>
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
      <div className={classes.options}>
        <LabeledCheckbox
          label="Login enabled for 30 days" name="login_30_days" checked={keepLogin}
          onChange={checked => { setKeepLogin(checked) }}
        />
      </div>
      <div className={classes.buttons}>
        <Grid container alignItems="center" justifyContent="center">
          <Grid item>
            <Button variant="outlined" type="submit" disabled={hasError()}>Enter</Button>
          </Grid>
        </Grid>
      </div>
    </form>
  )
}
