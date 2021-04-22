import React from 'react'
import ReactDOM from 'react-dom'
import {
  makeStyles,
  Theme,
  TextField,
  Button,
  Grid,
  InputLabel,
  NativeSelect
} from '@material-ui/core'
import { CURRENT_VERSION } from '../Settings'

type ScreenProps = {
  name: string
  thumbnailDataUrl: string
}

declare global {
  interface Window {
    settingsProxy: {
      requestSettings: () => Promise<Record<string, string>>,
      postSettings: (settings: Record<string, string>) => Promise<void>,
      getScreenPropsList: () => Promise<ScreenProps[]>
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

const Names = [
  'url',
  'room',
  'password',
  'duration',
  'zoom'
] as const

type Name = typeof Names[number]

type TextFieldMetadata = {
  name: Name,
  label: string,
  validate: (value: string) => boolean,
  errorMessage: string
  state: TextFieldState,
  dispatch: React.Dispatch<React.SetStateAction<TextFieldState>>
}

function useTextFieldMetadata(
  name: Name,
  label: string,
  validate: (value: string) => boolean,
  errorMessage: string
): TextFieldMetadata {
  const [state, dispatch] = React.useState<TextFieldState>({
    value: '',
    helperText: ''
  })
  return {
    name,
    label,
    validate,
    errorMessage,
    state,
    dispatch,
  }
}

const App: React.FC = (): JSX.Element => {
  const validateUrl = React.useCallback((v: string): boolean => /^wss?:\/\/.*/.test(v), [])
  const validateRoom = React.useCallback((v: string): boolean => v.length > 0, [])
  const validatePassword = React.useCallback((v: string): boolean => v.length > 0, [])
  const validateDuration = React.useCallback((v: string): boolean => !isNaN(Number(v)) && Number(v) >= 3, [])
  const validateZoom = React.useCallback((v: string): boolean => !isNaN(Number(v)) && Number(v) >= 30 && Number(v) <= 500, [])
  const textFields: TextFieldMetadata[] = [
    useTextFieldMetadata('url', 'Server URL', validateUrl, 'Input URL like "wss://hoge/app".'),
    useTextFieldMetadata('room', 'Room', validateRoom, 'Input room name.'),
    useTextFieldMetadata('password', 'Password', validatePassword, 'Input password.'),
    useTextFieldMetadata('duration', 'Message duration (seconds)', validateDuration, 'Must be >= 3.'),
    useTextFieldMetadata('zoom', 'Zoom (%)', validateZoom, 'Must be >= 50 and <= 500.')
  ]

  const [screenName, setScreenName] = React.useState<string>('')
  const [screenOptions, setScreenOptions] = React.useState<ScreenProps[]>([])

  React.useEffect((): void => {
    window.settingsProxy.requestSettings().then((settings: Record<string, string>): void => {
      for (const f of textFields) {
        f.dispatch({
          value: settings[f.name],
          helperText: ''
        })
      }
    })
    window.settingsProxy.getScreenPropsList().then((screenPropsList: ScreenProps[]): void => {
      const options = screenPropsList.map((p: ScreenProps): ScreenProps => ({ ...p }))
      console.log('screen options', options)
      setScreenOptions(options)
      if (options.length > 0) {
        setScreenName(options[0].name)
      }
    })
  }, [])

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    const settings: Record<string, string> = {
      version: CURRENT_VERSION,
    }
    for (const f of textFields) {
      settings[f.name] = f.state.value
    }
    window.settingsProxy.postSettings(settings)
    window.close()
  }

  function onTextFieldChange(e: React.ChangeEvent<HTMLInputElement>): void {
    console.log(e.target.name, e.target.value)
    const field = textFields.find((f: TextFieldMetadata): boolean => f.name === e.target.name)
    if (!field) {
      throw new Error(`Unexpected field: ${e.target.name}`)
    }

    // TODO Ping to validate url.
    field.dispatch({
      value: e.target.value,
      helperText: !field.validate(e.target.value) ? field.errorMessage : ''
    })
  }

  function onSelectChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    console.log(e.target.name, '-', e.target.value)
    setScreenName(e.target.value)
  }

  function hasError(): boolean {
    return textFields.some((f: TextFieldMetadata): boolean => f.state.helperText.length > 0)
  }

  const classes = useStyles();
  return (
    <form className={classes.root} onSubmit={onSubmit}>
      <p>
        {
          textFields.map((f: TextFieldMetadata): React.ReactNode => (
            <TextField
              fullWidth
              key={f.name}
              name={f.name}
              label={f.label}
              value={f.state.value}
              error={f.state.helperText.length > 0}
              helperText={f.state.helperText}
              onChange={onTextFieldChange}
            />
          ))
        }
        <InputLabel htmlFor="screen-select">Screen</InputLabel>
        <NativeSelect
          value={screenName}
          onChange={onSelectChange}
          inputProps= {{
            name: 'screen-name',
            id: 'screen-select'
          }}
        >
          {
            screenOptions.map((p: ScreenProps): React.ReactNode => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))
          }
        </NativeSelect>
        <img src={screenOptions.find((p: ScreenProps): boolean => p.name === screenName)?.thumbnailDataUrl} />
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
