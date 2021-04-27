import React from 'react'
import {
  makeStyles,
  Theme,
  TextField,
  Select,
  InputLabel,
  Checkbox,
  FormControlLabel
} from '@material-ui/core'
import { WatermarkSettings } from './hooks'
import {
  TextFieldMetadata,
  createTextFieldMetadata
} from './createTextFieldMetadata'

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    width: '80vw',
    margin: 'auto',
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(3)
  },
  buttons: {
    marginTop: theme.spacing(3),
  },
}))

interface WatermarkProps extends WatermarkSettings {
  onUpdate(key: keyof WatermarkSettings, value: string, error: boolean): void
}

export const Watermark: React.FC<React.PropsWithChildren<WatermarkProps>> = (props: WatermarkProps): JSX.Element => {
  const validateOpacity = (v: string): boolean => Number(v) >= 0 && Number(v) <= 1
  const validateColor = (v: string): boolean => v.length > 0
  const validateFontSize = (v: string): boolean => /^[1-9][0-9]*(px|pt|em|rem|%)$/.test(v)
  const validateOffset = validateFontSize
  const textFields: TextFieldMetadata<WatermarkSettings>[] = [
    createTextFieldMetadata('html', props.html, 'Text or HTML', 4, (): boolean => true, ''),
    createTextFieldMetadata('opacity', props.opacity, 'Opacity', 1, validateOpacity, 'Between 0 and 1.'),
    createTextFieldMetadata('color', props.color, 'Color (name or #hex)', 1, validateColor, 'Input color.'),
    createTextFieldMetadata('fontSize', props.fontSize, 'Font size (default 64px)', 1, validateFontSize, 'px, pt, em, rem or %.'),
    createTextFieldMetadata('offset', props.offset, 'Offset from screen edge', 1, validateOffset, 'px, pt, em, rem or %.'),
  ]

  function onTextFieldChange(e: React.ChangeEvent<HTMLInputElement>): void {
    console.log(e.target.name, e.target.value)
    const field = textFields.find((f: TextFieldMetadata<WatermarkSettings>): boolean => f.name === e.target.name)
    if (!field) {
      throw new Error(`Unexpected field: ${e.target.name}`)
    }
    const error = !field.validate(e.target.value)
    console.log('watermark error', error)
    props.onUpdate(field.name, e.target.value, error)
  }

  function onSelectChange(e: React.ChangeEvent<{ name?: string, value: unknown }>): void {
    console.log(e.target.name, '-', e.target.value)
    props.onUpdate('position', String(e.target.value), false)
  }

  function onCheckboxChange(e: React.ChangeEvent<HTMLInputElement>): void {
    console.log(e.target.name, '-', e.target.checked)
    props.onUpdate('noComments', String(e.target.checked), false)
  }

  const classes = useStyles()

  return (
    <div className={classes.root}>
      {
        textFields.map((f: TextFieldMetadata<WatermarkSettings>): React.ReactNode => (
          <TextField
            fullWidth
            multiline={f.rowsMax > 1}
            rowsMax={f.rowsMax}
            key={f.name}
            name={f.name}
            label={f.label}
            value={f.field.value}
            error={f.field.error}
            helperText={f.field.error ? f.errorMessage : ''}
            onChange={onTextFieldChange}
          />
        ))
      }
      <div>
        <InputLabel shrink id="watermark-position-label">Position</InputLabel>
        <Select
          labelId="watermark-position-label"
          id="watermrk-position"
          name="watermark-position"
          value={props.position.value || 'bottom-right'}
          onChange={onSelectChange}
        >
          {
            ['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((v: string): React.ReactNode => (
              <option key={v} value={v}>{v}</option>
            ))
          }
        </Select>
      </div>
      <div>
        <FormControlLabel
          control={
            <Checkbox
              checked={props.noComments.value === 'true'}
              color="primary"
              onChange={onCheckboxChange}
            />
          }
          label="No comments mode"
        />
      </div>
    </div>
  )
}