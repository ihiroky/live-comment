import React from 'react'
import ReactDOM from 'react-dom'
import {
  makeStyles,
  Theme,
  AppBar,
  Tabs,
  Tab,
  Box,
  Grid,
  Button
} from '@material-ui/core'
import { General } from './General'
import { Watermark } from './Watermark'
import {
  GeneralSettings,
  toGeneralSettings,
  WatermarkSettings,
  toWatermarkSettings,
  SettingsState,
  uselSettingsState
} from './hooks'

import { CURRENT_VERSION } from '../Settings'

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
    backgroundColor: theme.palette.background.paper,
    overflow: 'hidden'
  },
}))

const App: React.FC = (): JSX.Element => {

  const settingsState: SettingsState = uselSettingsState()

  const [value, setValue] = React.useState<number>(0)

  // eslint-disable-next-line @typescript-eslint/ban-types
  function onChange(e: React.ChangeEvent<{}>, newValue: number): void {
    console.log('onChange', value, newValue)
    setValue(newValue)
  }

  function onGeneralSettingsUpdate(key: keyof GeneralSettings, value: string, error: boolean): void {
    const field = settingsState.general[key]
    field.setField({ value, error })
  }

  function onWatermarkSettingsUpdate(key: keyof WatermarkSettings, value: string, error: boolean): void {
    const field = settingsState.watermark[key]
    console.log(key, value, error)
    field.setField({ value, error })
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    const settings: Record<string, string> = {
      version: CURRENT_VERSION,
    }
    let gkey: keyof GeneralSettings
    for (gkey in settingsState.general) {
      settings[gkey] = settingsState.general[gkey].field.value
    }
    const wm = {
      html: settingsState.watermark.html.field.value,
      color: settingsState.watermark.color.field.value
    }
    settings.watermark = JSON.stringify(wm)

    console.log('onsubmit', settings)
    window.settingsProxy.postSettings(settings)
    window.close()
  }

  function hasError(): boolean {
    let gkey: keyof GeneralSettings
    for (gkey in settingsState.general) {
      if (settingsState.general[gkey].field.error) {
        return true
      }
    }
    let wkey: keyof WatermarkSettings
    for (wkey in settingsState.watermark) {
      if (settingsState.watermark[wkey].field.error) {
        return true
      }
    }
    return false
  }

  const classes = useStyles();

  return (
    <form className={classes.root} onSubmit={onSubmit}>
      <AppBar position="static">
        <Tabs value={value} onChange={onChange} aria-label="setting tabs">
          <Tab label="General" { ...accessibilityProps(0) } />
          <Tab label="Watermark" { ...accessibilityProps(1) } />
        </Tabs>
      </AppBar>
      <TabPanel value={value} index={0}>
        <General onUpdate={onGeneralSettingsUpdate} { ...toGeneralSettings(settingsState.general) } />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Watermark onUpdate={onWatermarkSettingsUpdate} { ...toWatermarkSettings(settingsState.watermark) } />
      </TabPanel>
      <div>
        <Grid container alignItems="center" justify="center" spacing={3}>
          <Grid item>
            <Button variant="outlined" type="submit" disabled={hasError()}>OK</Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" onClick={() => window.close()}>Cancel</Button>
          </Grid>
        </Grid>
      </div>
    </form>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
