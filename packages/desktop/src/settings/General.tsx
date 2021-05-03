import React from 'react'
import {
  makeStyles,
  Theme,
  TextField,
  InputLabel,
  Select
} from '@material-ui/core'
import { GeneralSettings } from './types'
import {
  TextFieldMetadata,
  createTextFieldMetadata
} from './createTextFieldMetadata'
import { getLogger } from 'common'

type ScreenProps = {
  name: string
  thumbnailDataUrl: string
}

const log = getLogger('settings/General')

const useStyles = makeStyles((theme: Theme) => (
  {
    root: {
      width: '80vw',
      margin: 'auto',
      paddingTop: theme.spacing(3),
      paddingBottom: theme.spacing(3)
    },
    fields: {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1)
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


type GeneralProps = GeneralSettings & {
  onUpdate(name: keyof GeneralSettings, value: string, error: boolean): void
}

export const General: React.FC<React.PropsWithChildren<GeneralProps>> = (props: GeneralProps): JSX.Element => {
  const validateUrl = React.useCallback((v: string): boolean => /^wss?:\/\/.*/.test(v), [])
  const validateRoom = React.useCallback((v: string): boolean => v.length > 0, [])
  const validatePassword = React.useCallback((v: string): boolean => v.length > 0, [])
  const validateDuration = React.useCallback((v: string): boolean => !isNaN(Number(v)) && Number(v) >= 3, [])
  const validateZoom = React.useCallback((v: string): boolean => !isNaN(Number(v)) && Number(v) >= 30 && Number(v) <= 500, [])
  const textFields: TextFieldMetadata<GeneralSettings, string | number>[] = [
    createTextFieldMetadata('url', props.url, 'Server URL', 1, validateUrl, 'Input URL like "wss://hoge/app".'),
    createTextFieldMetadata('room', props.room, 'Room', 1, validateRoom, 'Input room name.'),
    createTextFieldMetadata('password', props.password, 'Password', 1, validatePassword, 'Input password.'),
    createTextFieldMetadata('duration', props.duration, 'Message duration (seconds)', 1, validateDuration, 'Must be >= 3.'),
    createTextFieldMetadata('zoom', props.zoom, 'Zoom (%)', 1, validateZoom, 'Must be >= 50 and <= 500.')
  ]
  const [screenOptions, setScreenOptions] = React.useState<ScreenProps[]>([])

  React.useEffect((): void => {
    window.settings.getScreenPropsList().then((screenPropsList: ScreenProps[]): void => {
      log.debug('[getScreenPropsList] General screenPropsList', screenPropsList)
      const options = screenPropsList.map((p: ScreenProps): ScreenProps => ({ ...p }))
      log.debug('[getScreenPropsList] screen options', options)
      setScreenOptions(options)
    })
  }, [])

  function onTextFieldChange(e: React.ChangeEvent<HTMLInputElement>): void {
    log.debug('[onTextFieldChanged]', e.target.name, e.target.value)
    const field = textFields.find((f: TextFieldMetadata<GeneralSettings, unknown>): boolean => f.name === e.target.name)
    if (!field) {
      throw new Error(`Unexpected field: ${e.target.name}`)
    }
    const error = !field.validate(e.target.value)
    props.onUpdate(field.name, e.target.value, error)
  }

  function onSelectChange(e: React.ChangeEvent<{ name?: string, value: unknown }>): void {
    log.debug('[onSelectChanged]', e.target.name, e.target.value)
    const strValue = String(e.target.value)
    const numValue = Number(e.target.value)
    props.onUpdate('screen', strValue, !isNaN(numValue))
  }

  const classes = useStyles();
  return (
    <div className={classes.root}>
      <div className={classes.fields}>
        {
          textFields.map((f: TextFieldMetadata<GeneralSettings, unknown>): React.ReactNode => (
            <TextField
              fullWidth
              key={f.name}
              name={f.name}
              type={f.name === 'password' ? 'password' : 'text'}
              label={f.label}
              value={f.value.data}
              error={f.value.error}
              helperText={f.value.error ? f.errorMessage : ''}
              onChange={onTextFieldChange}
            />
          ))
        }
        <div className={classes.screen}>
        { screenOptions.length > 0 &&
          <div>
            <InputLabel shrink id="screen-select-label">Screen</InputLabel>
            <Select
              labelId="screen-select-label"
              id="screen-select"
              name="screen-name"
              value={props.screen.data}
              onChange={onSelectChange}
            >
              {
                screenOptions.map((p: ScreenProps, i: number): React.ReactNode => (
                  <option key={p.name} value={i}>{p.name}</option>
                ))
              }
            </Select>
          </div>
          }
          <img
            style={{ paddingLeft: '10px' }}
            src={screenOptions.find((p: ScreenProps, i: number): boolean => i === props.screen.data)?.thumbnailDataUrl}
          />
        </div>
      </div>
    </div>
  )
}
