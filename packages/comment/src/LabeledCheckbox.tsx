import React from 'react'
import {
  FormControlLabel,
  Checkbox
} from '@material-ui/core'

type Props = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export const LabeledCheckbox: React.FC<Props> = ({ label, checked, onChange }: Props): JSX.Element => {
  const changeCallback = React.useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(e.target.checked)
  }, [onChange])

  return (
    <div>
      <FormControlLabel
        label={label}
        control={
          <Checkbox
            checked={checked}
            onChange={changeCallback}
            name="scroll_stop"
            color="primary"
          />
        }
      />
    </div>
  )
}
