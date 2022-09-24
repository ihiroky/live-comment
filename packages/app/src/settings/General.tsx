import { FC, useState, useEffect, ChangeEvent, ReactNode } from 'react'
import {
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  Grid,
  Input,
  FormHelperText,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material'
import makeStyles from '@mui/styles/makeStyles'
import { GeneralSettings } from './types'
import {
  TextFieldMetadata,
  createTextFieldMetadata
} from './createTextFieldMetadata'
import { getLogger } from '@/common/Logger'

type ScreenProps = {
  name: string
  thumbnailDataUrl: string
}

const log = getLogger('settings/General')

const useStyles = makeStyles({
  root: {
    width: '80vw',
    margin: 'auto',
    paddingTop: '24px',
    paddingBottom: '24px',
  },
  fields: {
    marginTop: '8px',
    marginBottom: '8px',
  },
  screen: {
    marginTop: '8px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  }
})


type GeneralProps = GeneralSettings & {
  usesConnectionSettings: boolean
  getScreenPropsList: () => Promise<ScreenProps[]>
  onUpdate(name: keyof GeneralSettings, value: string, error: boolean): void
}

const validateUrl = (v: string): boolean => /^wss?:\/\/./.test(v)
const validateRoom = (v: string): boolean => v.length > 0
const validatePassword = (v: string): boolean => v.length > 0
const validateDuration = (v: string): boolean => !isNaN(Number(v)) && Number(v) >= 3
const validateZoom = (v: string): boolean => !isNaN(Number(v)) && Number(v) >= 30 && Number(v) <= 500
const validateColor = (v: string): boolean => v.length > 0

function TF({ data, onChange }: {
  data: TextFieldMetadata<GeneralSettings, string | number>
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}): JSX.Element {
  const id = `gn-input-${data.name}`
  const helperTextId = `gn-input-helper-${data.name}`
  return (
    <>
      <InputLabel htmlFor={id}>{data.label}</InputLabel>
      <Input
        fullWidth
        id={id}
        key={data.name}
        name={data.name}
        type={data.name === 'password' ? 'password' : 'text'}
        value={data.value.data}
        error={data.value.error}
        onChange={onChange}
        aria-describedby={helperTextId}
      />
      <FormHelperText id={helperTextId}>
        {data.value.error ? data.errorMessage : ''}
      </FormHelperText>
    </>
  )
}

export const General: FC<GeneralProps> = (props: GeneralProps): JSX.Element => {
  const urlField = createTextFieldMetadata(
    'url', props.url, 'Server URL', 1, validateUrl, 'Input URL like "wss://hoge/app".'
  )
  const roomField = createTextFieldMetadata(
    'room', props.room, 'Room', 1, validateRoom, 'Input room name.'
  )
  const passwordField = createTextFieldMetadata(
    'password', props.password, 'Password', 1, validatePassword, 'Input password.'
  )
  const durationField = createTextFieldMetadata(
    'duration', props.duration, 'Message duration (seconds)', 1, validateDuration, 'Must be >= 3.'
  )
  const zoomField = createTextFieldMetadata(
    'zoom', props.zoom, 'Zoom (%)', 1, validateZoom, 'Must be >= 30 and <= 500.'
  )
  const fontColorField = createTextFieldMetadata(
    'fontColor', props.fontColor, 'Font color (color name or #hex)', 1, validateColor, 'Input color.'
  )
  const errorMessage = 'Font border color (color name or #hex, empty if no border)'
  const fontBorderColorField = createTextFieldMetadata(
    'fontBorderColor', props.fontBorderColor, errorMessage, 1, () => true, 'Input color.'
  )
  const textFields = [
    urlField, roomField, passwordField, durationField, zoomField, fontColorField, fontBorderColorField
  ]

  const [screenOptions, setScreenOptions] = useState<ScreenProps[]>([])

  const getScreenPropsList = props.getScreenPropsList
  useEffect((): void => {
    getScreenPropsList().then((screenPropsList: ScreenProps[]): void => {
      log.debug('[getScreenPropsList] General screenPropsList', screenPropsList)
      const options = screenPropsList.map((p: ScreenProps): ScreenProps => ({ ...p }))
      log.debug('[getScreenPropsList] screen options', options)
      setScreenOptions(options)
    })
  }, [getScreenPropsList])

  function onTextFieldChange(e: ChangeEvent<HTMLInputElement>): void {
    log.debug('[onTextFieldChanged]', e.target.name, e.target.value)
    const field = textFields.find((f: TextFieldMetadata<GeneralSettings, unknown>): boolean => f.name === e.target.name)
    if (!field) {
      throw new Error(`Unexpected field: ${e.target.name}`)
    }
    const error = !field.validate(e.target.value)
    props.onUpdate(field.name, e.target.value, error)
  }

  function onSelectChange(e: SelectChangeEvent<number>): void {
    log.debug('[onSelectChanged]', e.target.name, e.target.value)
    const strValue = String(e.target.value)
    const numValue = Number(e.target.value)
    props.onUpdate('screen', strValue, isNaN(numValue))
  }

  function onCheckboxChange(e: ChangeEvent<HTMLInputElement>): void {
    log.debug('[onCheckboxChange]', e.target.name, e.target.checked)
    props.onUpdate('gpu', String(e.target.checked), false)
  }

  const classes = useStyles()

  return (
    <div className={classes.root}>
      <div className={classes.fields}>
        <Grid container spacing={1}>
          {props.usesConnectionSettings && (
            <>
              <Grid item xs={12}>
                <TF data={urlField} onChange={onTextFieldChange} />
              </Grid>
              <Grid item xs={6}>
                <TF data={roomField} onChange={onTextFieldChange} />
              </Grid>
              <Grid item xs={6}>
                <TF data={passwordField} onChange={onTextFieldChange} />
              </Grid>
            </>
          )}
          <Grid item xs={6}>
            <TF data={durationField} onChange={onTextFieldChange} />
          </Grid>
          <Grid item xs={6}>
            <TF data={zoomField} onChange={onTextFieldChange} />
          </Grid>
          <Grid item xs={6}>
            <TF data={fontColorField} onChange={onTextFieldChange} />
          </Grid>
          <Grid item xs={6}>
            <TF data={fontBorderColorField} onChange={onTextFieldChange} />
          </Grid>
        </Grid>
        <FormControlLabel
          control={
            <Checkbox
              checked={props.gpu.data}
              color="primary"
              onChange={onCheckboxChange}
            />
          }
          label="Enable GPU Acceleration (restart me to enable)"
        />
        <div className={classes.screen}>
          { screenOptions.length > 0 &&
            <div>
              <InputLabel shrink htmlFor="screen-select">Screen</InputLabel>
              <Select
                id="screen-select"
                name="screen-name"
                value={props.screen.data}
                onChange={onSelectChange}
              >
                {
                  screenOptions.map((p: ScreenProps, i: number): ReactNode => (
                    <MenuItem key={p.name} value={i}>{p.name}</MenuItem>
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
