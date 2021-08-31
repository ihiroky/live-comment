import React from 'react'
import {
  makeStyles,
  Theme,
  Select,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Input,
  FormHelperText,
  MenuItem
} from '@material-ui/core'
import { WatermarkSettings, WatermarkPositions } from './types'
import {
  TextFieldMetadata,
  createTextFieldMetadata
} from './createTextFieldMetadata'
import { getLogger } from 'common'

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

const log = getLogger('settings/Watermark')

type WatermarkProps = WatermarkSettings & {
  onUpdate(key: keyof WatermarkSettings, value: string, error: boolean): void
}

export const Watermark: React.FC<React.PropsWithChildren<WatermarkProps>> = (props: WatermarkProps): JSX.Element => {
  const validateOpacity = (v: string): boolean => v.length > 0 && Number(v) >= 0 && Number(v) <= 1
  const validateColor = (v: string): boolean => v.length > 0
  const validateFontSize = (v: string): boolean => /^[1-9][0-9]*(px|pt|em|rem|%)$/.test(v)
  const validateOffset = validateFontSize
  const textFields: TextFieldMetadata<WatermarkSettings, unknown>[] = [
    createTextFieldMetadata('html', props.html, 'Text or HTML', 4, (): boolean => true, ''),
    createTextFieldMetadata('opacity', props.opacity, 'Opacity', 1, validateOpacity, 'Between 0 and 1.'),
    createTextFieldMetadata('color', props.color, 'Color (name or #hex)', 1, validateColor, 'Input color.'),
    createTextFieldMetadata('fontSize', props.fontSize, 'Font size (default 64px)', 1, validateFontSize, 'px, pt, em, rem or %.'),
    createTextFieldMetadata('offset', props.offset, 'Offset from screen edge', 1, validateOffset, 'px, pt, em, rem or %.'),
  ]

  function onTextFieldChange(e: React.ChangeEvent<HTMLInputElement>): void {
    log.debug('[onTextFeildChange]', e.target.name, e.target.value)
    const field = textFields.find((f: TextFieldMetadata<WatermarkSettings, unknown>): boolean => f.name === e.target.name)
    if (!field) {
      throw new Error(`Unexpected field: ${e.target.name}`)
    }
    const error = !field.validate(e.target.value)
    log.debug('[onTextFieldChange] Watermark error', error)
    props.onUpdate(field.name, e.target.value, error)
  }

  function onSelectChange(e: React.ChangeEvent<{ name?: string, value: unknown }>): void {
    log.debug('[onSelectChange]', e.target.name, '-', e.target.value)
    props.onUpdate('position', String(e.target.value), false)
  }

  function onCheckboxChange(e: React.ChangeEvent<HTMLInputElement>): void {
    log.debug('[onCheckboxChange]', e.target.name, '-', e.target.checked)
    props.onUpdate('noComments', String(e.target.checked), false)
  }

  const classes = useStyles()

  return (
    <div className={classes.root}>
      {
        textFields.map((f: TextFieldMetadata<WatermarkSettings, unknown>): React.ReactNode => {
          const id = `wm-input-${f.name}`
          const helperTextId = `wm-input-helper-${f.name}`
          return (
            <React.Fragment key={id}>
              <InputLabel htmlFor={id}>{f.label}</InputLabel>
              <Input
                fullWidth
                id={id}
                multiline={f.rowsMax > 1}
                rowsMax={f.rowsMax}
                key={f.name}
                name={f.name}
                value={f.value.data}
                error={f.value.error}
                onChange={onTextFieldChange}
              />
              <FormHelperText id={helperTextId}>{f.value.error ? f.errorMessage : ''}</FormHelperText>
            </React.Fragment>
          )
        })
      }
      <div>
        <InputLabel shrink id="watermark-position-label">Position</InputLabel>
        <Select
          labelId="watermark-position-label"
          id="watermrk-position"
          name="watermark-position"
          value={props.position.data || 'bottom-right'}
          onChange={onSelectChange}
        >
          {
            WatermarkPositions.map((v: string): React.ReactNode => (
              <MenuItem key={v} value={v}>{v}</MenuItem>
            ))
          }
        </Select>
      </div>
      <div>
        <FormControlLabel
          control={
            <Checkbox
              checked={props.noComments.data}
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