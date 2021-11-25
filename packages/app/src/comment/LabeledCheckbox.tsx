import { useCallback } from 'react'
import {
  FormControlLabel,
  Checkbox
} from '@mui/material'

type Props = {
  label: string
  name: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export const LabeledCheckbox: React.FC<Props> = ({ label, name, checked, onChange }: Props): JSX.Element => {
  const changeCallback = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
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
            name={name}
            color="primary"
          />
        }
      />
    </div>
  )
}
