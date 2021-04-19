import React from 'react'
import ReactDOM from 'react-dom'
import {
  makeStyles,
  Theme,
  TextField,
  Button,
  Grid
} from '@material-ui/core'
import { CURRENT_VERSION } from '../Settings'
declare global {
  interface Window {
    settingsProxy: {
      requestSettings: () => Promise<Record<string, string>>,
      postSettings: (settings: Record<string, string>) => Promise<void>
    }
  }
}

interface TextFieldState {
  value: string,
  helperText: string
}

const useStyles = makeStyles((theme: Theme) => (
  {
    root: {
      width: '80vw',
      height: '80vh',
      margin: 'auto',
      padding: theme.spacing(3)
    }
  }
))

const App: React.FC = (): JSX.Element => {
  const [serverUrl, setServerUrl] = React.useState<TextFieldState>({
    value: '',
    helperText: ''
  })
  const [room, setRoom] = React.useState<TextFieldState>({
    value: '',
    helperText: ''
  })
  const [password, setPassword] = React.useState<TextFieldState>({
    value: '',
    helperText: ''
  })
  const [messageDuration, setMessageDuration] = React.useState<TextFieldState>({
    value: '',
    helperText: ''
  })
  React.useEffect((): void => {
    window.settingsProxy.requestSettings().then((settings: Record<string, string>): void => {
      setServerUrl({
        value: settings.url,
        helperText: '',
      })
      setRoom({
        value: settings.room,
        helperText: '',
      })
      setPassword({
        value: settings.password,
        helperText: '',
      })
      setMessageDuration({
        value: settings.messageDuration,
        helperText: '',
      })
    })
  }, [])
  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    const settings: Record<string, string> = {
      version: CURRENT_VERSION,
      url: serverUrl.value,
      room: room.value,
      password: password.value,
      messageDuration: messageDuration.value
    }
    window.settingsProxy.postSettings(settings)
    window.close()
  }
  function onTextFieldChange(e: React.ChangeEvent<HTMLInputElement>): void {
    console.log(e.target.name, e.target.value)
    switch (e.target.name) {
      case 'serverUrl': {
        // TODO Ping to validate
        const error = !/^wss?:\/\/.*/.test(e.target.value)
        setServerUrl({
          value: e.target.value,
          helperText: error ? 'Input URL like "wss://hoge/app".' : ''
        })
        break
      }
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
      case 'messageDuration': {
        const n = Number(e.target.value)
        const error = isNaN(n) || n < 3
        setMessageDuration({
          value: e.target.value,
          helperText: error ? 'Must be >= 3.' : ''
        })
        break
      }
    }
  }
  function hasError(): boolean {
    return serverUrl.helperText.length > 0
      || messageDuration.helperText.length > 0
      || room.helperText.length > 0
      || password.helperText.length > 0
  }

  const classes = useStyles();
  return (
    <form className={classes.root} onSubmit={onSubmit}>
      <p>
        <TextField
          fullWidth
          label="Server URL"
          name="serverUrl"
          value={serverUrl.value}
          error={serverUrl.helperText.length > 0}
          helperText={serverUrl.helperText}
          onChange={onTextFieldChange}
        />
        <TextField
          fullWidth
          label="Room"
          name="room"
          value={room.value}
          error={room.helperText.length > 0}
          helperText={room.helperText}
          onChange={onTextFieldChange}
        />
        <TextField
          fullWidth
          label="Password"
          name="password"
          type="password"
          value={password.value}
          error={password.helperText.length > 0}
          helperText={password.helperText}
          onChange={onTextFieldChange}
        />
        <TextField
          fullWidth
          label="Message duration (seconds)"
          name="messageDuration"
          value={messageDuration.value}
          error={messageDuration.helperText.length > 0}
          helperText={messageDuration.helperText}
          onChange={onTextFieldChange}
        />
      </p>
      <p>
        <Grid container alignItems="center" justify="center" spacing={3}>
          <Grid item>
            <Button variant="outlined" type="submit" disabled={hasError()}>OK</Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" onClick={() => window.close()}>Cancel</Button>
          </Grid>
        </Grid>
      </p>
    </form>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
