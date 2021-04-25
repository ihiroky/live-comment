import React, { PropsWithChildren } from 'react'
import {
  makeStyles,
  Theme,
  TextField
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

export const Watermark: React.FC<PropsWithChildren<WatermarkProps>> = (props: WatermarkProps): JSX.Element => {
  const validateHTML = (value: string): boolean => value.length > 0
  const validateColor = (valudate: string): boolean => valudate.length > 0
  const textFields: TextFieldMetadata<WatermarkSettings>[] = [
    createTextFieldMetadata('html', props.html, 'HTML', 4, validateHTML, 'Input HTML or text.'),
    createTextFieldMetadata('color', props.color, 'Color', 1, validateColor, 'Input color.')
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
    </div>
  )
}