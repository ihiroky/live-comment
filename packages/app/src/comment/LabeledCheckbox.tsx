import { useCallback } from 'react'
import {
  FormControlLabel,
  Checkbox,
  Tooltip
} from '@mui/material'
import { styled } from '@mui/system'

type Props = {
  label: string
  hint?: string
  name: string
  checked: boolean
  onChange: (checked: boolean) => void
}

const CompactLabel = styled(FormControlLabel)({
  margin: 0,
  color: '#315746',
  '& .MuiFormControlLabel-label': {
    fontSize: 14,
  },
})

export const LabeledCheckbox: React.FC<Props> = ({ label, hint, name, checked, onChange }: Props): JSX.Element => {
  const changeCallback = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(e.target.checked)
  }, [onChange])

  const labelControl = (
    <CompactLabel
      label={label}
      control={
        <Checkbox
          checked={checked}
          onChange={changeCallback}
          name={name}
          size="small"
          sx={{
            padding: '2px 2px 2px 0',
            '&.Mui-checked': {
              color: '#20a86d',
            },
            '& .MuiSvgIcon-root': {
              fontSize: 17,
            },
          }}
        />
      }
    />
  )

  return hint
    ? (
      <Tooltip title={hint} arrow placement="top" describeChild>
        {labelControl}
      </Tooltip>
    )
    : labelControl
}
