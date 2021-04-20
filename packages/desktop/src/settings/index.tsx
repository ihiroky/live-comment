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

const Names = [
  'url',
  'room',
  'password',
  'duration',
  'zoom'
] as const

type Name = typeof Names[number]

type Field = {
  name: Name,
  label: string,
  validate: (value: string) => boolean,
  errorMessage: string
  state: TextFieldState,
  dispatch: React.Dispatch<React.SetStateAction<TextFieldState>>
}

function useField(
  name: Name,
  label: string,
  validate: (value: string) => boolean,
  errorMessage: string): Field {
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
  const validateUrl = (v: string): boolean => /^wss?:\/\/.*/.test(v)
  const validateRoom = (v: string): boolean => v.length > 0
  const validatePassword = (v: string): boolean => v.length > 0
  const validateDuration = (v: string): boolean => !isNaN(Number(v)) && Number(v) >= 3
  const validateZoom = (v: string): boolean => !isNaN(Number(v)) && Number(v) >= 30 && Number(v) <= 500
  const fields: Field[] = [
    useField('url', 'Server URL', validateUrl, 'Input URL like "wss://hoge/app".'),
    useField('room', 'Room', validateRoom, 'Input room name.'),
    useField('password', 'Password', validatePassword, 'Input password.'),
    useField('duration', 'Message duration (seconds)', validateDuration, 'Must be >= 3.'),
    useField('zoom', 'Zoom (%)', validateZoom, 'Must be >= 50 and <= 500.')
  ]

  React.useEffect((): void => {
    window.settingsProxy.requestSettings().then((settings: Record<string, string>): void => {
      for (const f of fields) {
        f.dispatch({
          value: settings[f.name],
          helperText: ''
        })
      }
    })
  }, [])

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    const settings: Record<string, string> = {
      version: CURRENT_VERSION,
    }
    for (const f of fields) {
      settings[f.name] = f.state.value
    }
    window.settingsProxy.postSettings(settings)
    window.close()
  }

  function onTextFieldChange(e: React.ChangeEvent<HTMLInputElement>): void {
    console.log(e.target.name, e.target.value)
    const field = fields.find((f: Field): boolean => f.name === e.target.name)
    if (!field) {
      throw new Error(`Unexpected field: ${e.target.name}`)
    }

    // TODO Ping to validate url.
    field.dispatch({
      value: e.target.value,
      helperText: !field.validate(e.target.value) ? field.errorMessage : ''
    })
  }

  function hasError(): boolean {
    return fields.some((f: Field): boolean => f.state.helperText.length > 0)
  }

  const classes = useStyles();
  return (
    <form className={classes.root} onSubmit={onSubmit}>
      <p>
        {
          fields.map((f: Field): JSX.Element => (
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
