import React from 'react'
import {
  TextField,
  createStyles,
  makeStyles,
  Theme,
} from '@material-ui/core'

type CommandPaletteProps = {
  onExecute: (command: string) => void
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      position: 'absolute',
      left: '10%',
      right: '10%',
      bottom: '5%',
      padding: theme.spacing(1),
    },
    text: {
      width: '100%',
      opacity: 0.8,
      backgroundColor: '#fff',
      fontSize: '48px',
    }
  })
)

export function CommandPalette(props: CommandPaletteProps): JSX.Element {
  const classes =  useStyles()
  const [command, setCommand] = React.useState<string>('')

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    props.onExecute(command)
    setCommand('')
  }

  // TODO Show icon to indicate whether current input is a command or a comment
  return (
    <form className={classes.root} onSubmit={onSubmit}>
      <TextField
        placeholder="Type command, then press enter to execute. Press F1 to close."
        className={classes.text}
        variant="outlined"
        autoFocus
        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => { setCommand(e.target.value) }}
      />
    </form>
  )
}
