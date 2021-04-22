import React from 'react'
import ReactDOM from 'react-dom'
import {
  makeStyles,
  Theme,
  TextField,
  Button,
  Grid,
  InputLabel,
  Select
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
    },
    fields: {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1)
    },
    buttons: {
      marginTop: theme.spacing(3),
    },
    screen: {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
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

  const [screenIndex, setScreenIndex] = React.useState<number>(0)
  const [screenOptions, setScreenOptions] = React.useState<ScreenProps[]>([])

  React.useEffect((): void => {
    window.settingsProxy.requestSettings().then((settings: Record<string, string>): void => {
      for (const f of textFields) {
        f.dispatch({
          value: settings[f.name],
          helperText: ''
        })
      }
      const si = parseInt(settings.screen)
      if (!isNaN(si)) {
        setScreenIndex(si)
      }
    })
    window.settingsProxy.getScreenPropsList().then((screenPropsList: ScreenProps[]): void => {
      const options = screenPropsList.map((p: ScreenProps): ScreenProps => ({ ...p }))
      console.log('screen options', options)
      setScreenOptions(options)
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
    settings.screen = String(screenIndex)
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

  function onSelectChange(e: React.ChangeEvent<{ name?: string, value: unknown }>): void {
    console.log(e.target.name, '-', e.target.value)
    const index = Number(e.target.value)
    setScreenIndex(!isNaN(index) ? index : 0)
  }

  function hasError(): boolean {
    return textFields.some((f: TextFieldMetadata): boolean => f.state.helperText.length > 0)
  }

  const classes = useStyles();
  return (
    <form className={classes.root} onSubmit={onSubmit}>
      <div className={classes.fields}>
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
        <div className={classes.screen}>
          <div>
            <InputLabel shrink id="screen-select-label">Screen</InputLabel>
            <Select
              labelId="screen-select-label"
              id="screen-select"
              name="screen-name"
              value={screenIndex}
              onChange={onSelectChange}
            >
              {
                screenOptions.map((p: ScreenProps, i: number): React.ReactNode => (
                  <option key={p.name} value={i}>{p.name}</option>
                ))
              }
            </Select>
          </div>
          <img style={{ paddingLeft: '10px' }} src={screenOptions.find((p: ScreenProps, i: number): boolean => i === screenIndex)?.thumbnailDataUrl} />
        </div>
      </div>
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

ReactDOM.render(<App />, document.getElementById('root'))
