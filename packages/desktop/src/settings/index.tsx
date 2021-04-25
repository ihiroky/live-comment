import React from 'react'
import ReactDOM from 'react-dom'
import {
  makeStyles,
  Theme,
  AppBar,
  Tabs,
  Tab,
  Box
} from '@material-ui/core'
import { General } from './General'
import { Watermark } from './Watermark'

interface TabPanelProps {
  children?: React.ReactNode
  index: number,
  value: number
}

function TabPanel(props: TabPanelProps): JSX.Element {
  const { children, index, value } = props
  return (
    <div
      role="tabpanel"
      hidden={ value !== index }
      id={ `tab-panel-${index}` }
      aria-labelledby={ `tab-${index} `}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  )
}

function accessibilityProps(index: number): { id: string, 'aria-controls': string } {
  return {
    id: `tab-${index}`,
    'aria-controls': `tab-panel-${index}`
  }
}

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper
  }
}))

const App: React.FC = (): JSX.Element => {
  const [value, setValue] = React.useState<number>(0)

  // eslint-disable-next-line @typescript-eslint/ban-types
  function onChange(e: React.ChangeEvent<{}>, newValue: number): void {
    console.log('onChange', value, newValue)
    setValue(newValue)
  }

  const classes = useStyles();

  return (
    <div className={classes.root}>
      <AppBar position="static">
        <Tabs value={value} onChange={onChange} aria-label="setting tabs">
          <Tab label="General" { ...accessibilityProps(0) } />
          <Tab label="Watermark" { ...accessibilityProps(1) } />
        </Tabs>
      </AppBar>
      <TabPanel value={value} index={0}>
        <General />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Watermark />
      </TabPanel>
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
