import { FC, ChangeEvent, FormEvent, useState, useCallback, useEffect, useSyncExternalStore } from 'react'
import { TextField, Button, Grid, Divider } from '@mui/material'
import { styled } from '@mui/system'
import {
  AcnMessage,
  isAcnMessage,
  isAcnOkMessage,
  isErrorMessage,
  Message,
} from '@/common/Message'
import {
  createHash,
  isExtensionOrElectron,
} from '@/common/utils'
import { serverConfigStore } from './utils/serverConfigStore'
import { getLogger } from '@/common/Logger'
import {
  gotoCommentPage,
  login,
  getToken,
  setToken,
  goto,
} from './utils/pages'
import { LabeledCheckbox } from './LabeledCheckbox'
import { NavigateFunction } from 'react-router-dom'
import jwtDecode, { JwtPayload } from 'jwt-decode'

interface TextFieldState {
  value: string
  helperText: string
}

const RootForm = styled('form')({
  minWidth: '300px',
  width: '400px',
  minHeight: '300px',
  height: '400px',
  margin: 'auto',
  padding: '8px',
})

const LogoImg = styled('img')({
  display: 'flex',
  margin: 'auto',
})

const LogCreditDiv = styled('div')({
  display: 'flex',
  justifyContent: 'flex-end',
  fontSize: 'x-small',
})

const NotificationDiv = styled('div')({
  color: 'red'
})

const TextsDiv = styled('div')({
  padding: '8px'
})

const OptionsDiv = styled('div')({
  padding: '8px'
})

const ButtonsDiv = styled('div')({
  padding: '8px'
})

const log = getLogger('LoginForm')

type LoginFormProps = {
  origin: string
  apiUrl: string
  navigate?: NavigateFunction
}

export const LoginForm: FC<LoginFormProps> = ({ origin, apiUrl, navigate }: LoginFormProps): JSX.Element => {
  const [notification, setNotification] = useState<{ message: string }>({
    message: ''
  })
  const [room, setRoom] = useState<TextFieldState>({
    value: '',
    helperText: '',
  })
  const [password, setPassword] = useState<TextFieldState>({
    value: '',
    helperText: '',
  })
  const [keepLogin, setKeepLogin] = useState<boolean>(false)

  useEffect((): void => {
    const token = getToken()
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

  const loginCallback = useCallback((m: Message): undefined => {
    if (!isAcnOkMessage(m)) {
      setNotification({ message: `Login failed (${ isErrorMessage(m) ? m.message : JSON.stringify(m)})` })
      return
    }
    setToken(m.attrs.token)
    gotoCommentPage(navigate)
  }, [navigate])

  useEffect((): () => void => {
    serverConfigStore.update(apiUrl)

    // For electron
    if (window.comment) {
      const unsubscribeLoggedIn = window.comment.onLoggedIn(
        (m: AcnMessage): void => {
          login(apiUrl, m.room, m.hash, false).then(loginCallback)
        }
      )
      return unsubscribeLoggedIn
    }

    // For extension
    const onMessage = (ev: MessageEvent): void => {
      log.debug('[onMessage]', ev)
      if (ev.origin !== origin) {
        setNotification({ message: 'Invalid origin from SAML login window: ' + ev.origin })
        return
      }
      if (!isAcnMessage(ev.data)) {
        setNotification({ message: 'Invalid message from SAML login window: ' + JSON.stringify(ev.data) })
        return
      }
      login(apiUrl, ev.data.room, ev.data.hash, false).then(loginCallback)
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [origin, apiUrl, loginCallback])

  const onSubmit = useCallback((e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    login(apiUrl, room.value, createHash(password.value), keepLogin).then(loginCallback)
  }, [apiUrl, room.value, password.value, keepLogin, loginCallback])

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
          helperText: error ? 'Input room name' : ''
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

  const serverConfig = useSyncExternalStore(serverConfigStore.subscribe, serverConfigStore.getSnapshot)

  return (
    <RootForm onSubmit={onSubmit}>
      <div>
        <LogoImg src="./logo.png"/>
        <LogCreditDiv>
          Image by
          <a href="https://www.sasagawa-brand.co.jp/tada/detail.php?id=1145&cid=4&cid2=14"
            target="_blank"
            rel="noreferrer">TADAira</a>.
          Change of
          <a href="https://github.com/ihiroky/live-comment"
            target="_blank"
            rel="noreferrer">Live Comment</a>.
        </LogCreditDiv>
      </div>
      { serverConfig.samlEnabled
        ? (
          <>
            <ButtonsDiv>
              <Grid container alignItems="center" justifyContent="center">
                <Grid item>
                  <Button sx={{ mt: 4, mb: 4}} variant="outlined" type="button"
                    onClick={() => { !isExtensionOrElectron()
                      ? goto(`${apiUrl}/saml/login`)
                      : window.open(`${apiUrl}/saml/login`, 'saml-login', 'width=475,height=600')
                    }}
                  >
                    SSO Login
                  </Button>
                </Grid>
              </Grid>
            </ButtonsDiv>
            <Divider>OR</Divider>
          </>
        )
        : undefined
      }
      <TextsDiv>
        <NotificationDiv role="status">{notification.message}</NotificationDiv>
        <TextField
          fullWidth
          label="Room"
          name="room"
          variant="standard"
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
          variant="standard"
          value={password.value}
          error={password.value.length === 0}
          helperText={password.helperText}
          margin="normal"
          onChange={onTextFieldChange}
        />
      </TextsDiv>
      <OptionsDiv>
        <LabeledCheckbox
          label="Login enabled for 30 days" name="login_30_days" checked={keepLogin}
          onChange={setKeepLogin}
        />
      </OptionsDiv>
      <ButtonsDiv>
        <Grid container alignItems="center" justifyContent="center">
          <Grid item>
            <Button variant="outlined" type="submit" disabled={hasError()}>Enter</Button>
          </Grid>
        </Grid>
      </ButtonsDiv>
    </RootForm>
  )
}
