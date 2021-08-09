import React from 'react'
import {
  FormControlLabel,
  Checkbox
} from '@material-ui/core'

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
}

export const StopAutoScroll: React.FC<Props> = ({ checked, onChange }: Props): JSX.Element => {
  const changeCallback = React.useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(e.target.checked)
  }, [onChange])

  return (
    <div>
      <FormControlLabel
        className="auto-scroll"
        label="Auto scroll"
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
