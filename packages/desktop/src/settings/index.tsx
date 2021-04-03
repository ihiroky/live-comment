import React from 'react'
import ReactDOM from 'react-dom'
import { Paper, Typography, makeStyles, Theme } from '@material-ui/core'

const useStyles = makeStyles((theme: Theme) => (
  {
    root: {
      padding: theme.spacing(3)
    }
  }
))

interface HeadProps {
  headline: string
}
const Head: React.FC<HeadProps> = (props: React.PropsWithChildren<HeadProps>): JSX.Element => {
  return (
    <Typography variant="h3" component="h1">
      {props.headline}
    </Typography>
  )
}

const App: React.FC = () => {
  const classes = useStyles();
  return (
    <Paper className={classes.root}>
      <Head headline="Setting Form" />
    </Paper>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
