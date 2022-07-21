import { FC, ChangeEvent, FormEvent, useState, useCallback, useEffect } from 'react'
import { TextField, Button, Grid } from '@mui/material'
import makeStyles from '@mui/styles/makeStyles'
import {
  AcnMessage,
  isAcnOkMessage,
  isErrorMessage,
  Message,
} from '@/common/Message'
import {
  createHash,
  fetchWithTimeout,
} from '@/common/utils'
import { getLogger } from '@/common/Logger'
import { gotoCommentPage } from './utils/pages'
import { LabeledCheckbox } from './LabeledCheckbox'
import { NavigateFunction } from 'react-router-dom'
import jwtDecode, { JwtPayload } from 'jwt-decode'

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
    padding: '8px',
  },
  logo: {
    display: 'flex',
    margin: 'auto',
  },
  logoCredit: {
    display: 'flex',
    justifyContent: 'flex-end',
    fontSize: 'x-small',
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

type LoginFormProps = {
  apiUrl: string
  navigate?: NavigateFunction
}

export const LoginForm: FC<LoginFormProps> = ({ apiUrl, navigate }: LoginFormProps): JSX.Element => {
  const [notification, setNotification] = useState<{ message: string }>({
    message: ''
  })
  const [room, setRoom] = useState<TextFieldState>({
    value: '',
    helperText: 'Input room name',
  })
  const [password, setPassword] = useState<TextFieldState>({
    value: '',
    helperText: 'Input password of the room',
  })
  const [keepLogin, setKeepLogin] = useState<boolean>(false)

  useEffect((): void => {
    const token = window.localStorage.getItem('token')
    if (token) {
      const payload = jwtDecode<JwtPayload & { room: string }>(token)
      if ((payload.exp !== undefined) && (payload.exp > Date.now() / 1000)) {
        gotoCommentPage(navigate)
        return
      }
    }
    const json = window.localStorage.getItem('App.notification')
    if (!json) {
      setNotification({ message: '' })
      return
    }
    window.localStorage.removeItem('App.notification')
    const notification = JSON.parse(json)
    setNotification(notification)
  }, [navigate])

  const onSubmit = useCallback((e: FormEvent<HTMLFormElement>): void => {
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
        gotoCommentPage(navigate)
        return
      }
      setNotification({ message: `Login failed (${ isErrorMessage(m) ? m.message : JSON.stringify(m)})` })
    })
  }, [apiUrl, navigate, room.value, password.value, keepLogin])

  const onTextFieldChange = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    log.debug('[onTextFieldChanged]', e.target.name, e.target.value)
    if (notification.message.length > 0) {
      setNotification({ message: '' })
    }
    const error = e.target.value.length === 0
    switch (e.target.name) {
      case 'room': {
        setRoom({
          value: e.target.value,
          helperText: error ? 'Input room name.' : ''
        })
        break
      }
      case 'password': {
        setPassword({
          value: e.target.value,
          helperText: error ? 'Input password' : ''
        })
        break
      }
    }
  }, [notification.message.length])

  const hasError = useCallback((): boolean => {
    return room.helperText.length > 0 || password.helperText.length > 0
  }, [room.helperText, password.helperText])

  const classes = useStyles()
  return (
    <form className={classes.root} onSubmit={onSubmit}>
      <div>
        <img
          className={classes.logo}
          src="./assets/logo.png"
        />
        <div className={classes.logoCredit}>
          Image by
          <a href="https://www.sasagawa-brand.co.jp/tada/detail.php?id=1145&cid=4&cid2=14"
            target="_blank"
            rel="noreferrer">TADAira</a>.
          Change of
          <a href="https://github.com/ihiroky/live-comment"
            target="_blank"
            rel="noreferrer">Live Comment</a>.
        </div>
      </div>
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
          onChange={setKeepLogin}
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
