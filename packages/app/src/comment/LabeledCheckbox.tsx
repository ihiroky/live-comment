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
  margin: '0 14px 0 0',
  minHeight: 24,
  color: '#315746',
  '& .MuiFormControlLabel-label': {
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.2,
    letterSpacing: 0,
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
            color: 'rgba(49, 87, 70, 0.52)',
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
