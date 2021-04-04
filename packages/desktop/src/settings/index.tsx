import React from 'react'
import ReactDOM from 'react-dom'
import {
  makeStyles,
  Theme,
  TextField,
  Button,
  Grid
} from '@material-ui/core'

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
  error: boolean,
  helperText: string
}

const useStyles = makeStyles((theme: Theme) => (
  {
    root: {
      width: '80vw',
      height: '80vh',
      padding: theme.spacing(3)
    }
  }
))

const App: React.FC = (): JSX.Element => {
  const [serverUrl, setServerUrl] = React.useState<TextFieldState>({
    value: '',
    error: true,
    helperText: ''
  })
  const [messageDuration, setMessageDuration] = React.useState<TextFieldState>({
    value: '',
    error: true,
    helperText: ''
  })
  React.useEffect((): void => {
    window.settingsProxy.requestSettings().then((settings: Record<string, string>): void => {
      const newServerUrl: TextFieldState = {
        value: settings['url'],
        error: false,
        helperText: '',
      }
      setServerUrl(newServerUrl)
      const newMessageDuration: TextFieldState = {
        value: settings['messageDuration'],
        error: false,
        helperText: ''
      }
      setMessageDuration(newMessageDuration)
    })
  }, [])
  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    const settings: Record<string, string> = {}
    settings.url = serverUrl.value
    settings.messageDuration = messageDuration.value
    window.settingsProxy.postSettings(settings)
    window.close()
  }
  function onTextFieldChange(e: React.ChangeEvent<HTMLInputElement>): void {
    console.log(e.target.name, e.target.value)
    switch (e.target.name) {
      case 'serverUrl': {
        // TODO Ping to validate
        const state = { ...serverUrl }
        state.value = e.target.value
        state.error = !/^wss?:\/\/.*/.test(e.target.value)
        if (state.error) {
          state.helperText = 'Input URL like "wss://hoge/app".'
        }
        setServerUrl(state)
        break
      }
      case 'messageDuration': {
        const state = { ...messageDuration }
        state.value = e.target.value
        state.error = !/^[1-9]\d*$/.test(e.target.value)
        if (state.error) {
          state.helperText = 'Input number.'
        }
        setMessageDuration(state)
        break
      }
    }
  }
  function hasError(): boolean {
    return serverUrl.error || messageDuration.error
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
          error={serverUrl.error}
          helperText={serverUrl.helperText}
          onChange={onTextFieldChange}
        />
        <TextField
          fullWidth
          label="Message duration (seconds)"
          name="messageDuration"
          value={messageDuration.value}
          error={messageDuration.error}
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
