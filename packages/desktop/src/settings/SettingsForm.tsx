import React from 'react'
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
import { useSettingsState } from './hooks'
import {
  Settings,
  GeneralSettings,
  WatermarkSettings,
  GeneralSettingsState,
  WatermarkSettingsState,
  SettingsState,
  isWatermarkPosition
} from './types'
import { getLogger } from 'common'

type TabPanelProps = {
  children?: React.ReactNode
  index: number
  value: number
}

const log = getLogger('settings/App')

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

function toGeneralSettings(state: GeneralSettingsState): GeneralSettings {
  return {
    url: state.url.value,
    room: state.room.value,
    password: state.password.value,
    duration: state.duration.value,
    zoom: state.zoom.value,
    screen: state.screen.value
  }
}

function toWatermarkSettings(state: WatermarkSettingsState): WatermarkSettings {
  return {
    html: state.html.value,
    opacity: state.opacity.value,
    color: state.color.value,
    fontSize: state.fontSize.value,
    position: state.position.value,
    offset: state.offset.value,
    noComments: state.noComments.value
  }
}

export const SettingsForm: React.FC = (): JSX.Element => {

  const settingsState: SettingsState = useSettingsState()
  const [value, setValue] = React.useState<number>(0)

  // eslint-disable-next-line @typescript-eslint/ban-types
  function onChange(e: React.ChangeEvent<{}>, newValue: number): void {
    log.debug('[onChange]', value, newValue)
    setValue(newValue)
  }

  function onGeneralSettingsUpdate(key: keyof GeneralSettings, value: string, error: boolean): void {
    const g = settingsState.general
    if (key === 'url' || key === 'room' || key === 'password' || key === 'duration' || key === 'zoom') {
      g[key].setValue({ data: value, error })
    } else if (key === 'screen') {
      g[key].setValue({ data: Number(value), error })
    } else {
      throw new Error(`Unexpected key: ${key}`)
    }
  }

  function onWatermarkSettingsUpdate(key: keyof WatermarkSettings, value: string, error: boolean): void {
    const w = settingsState.watermark
    if (key === 'html' || key === 'opacity' || key === 'color' || key === 'fontSize' || key === 'offset') {
      w[key].setValue({ data: value, error })
    } else if (key === 'position') {
      if (!isWatermarkPosition(value)) {
        throw new Error(`Unexpeced value of position: ${value}`)
      }
      w[key].setValue({ data: value, error })
    } else if (key === 'noComments') {
      w[key].setValue({ data: value.toLowerCase() === 'true', error })
    } else {
      throw new Error(`Unexpected key: ${key}`)
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    const g = settingsState.general
    const w = settingsState.watermark
    const settings: Settings = {
      version: '1',
      general: {
        url: g.url.value.data,
        room: g.room.value.data,
        password: g.password.value.data,
        duration: Number(g.duration.value.data),
        zoom: Number(g.zoom.value.data),
        screen: g.screen.value.data
      },
      watermark: {
        html: w.html.value.data,
        opacity: Number(w.opacity.value.data),
        color: w.color.value.data,
        fontSize: w.fontSize.value.data,
        position: w.position.value.data,
        offset: w.offset.value.data,
        noComments: w.noComments.value.data
      }
    }
    log.debug('[onSubmit]', settings)
    window.settings.postSettings(settings)
    window.close()
  }

  function hasError(): boolean {
    let gkey: keyof GeneralSettings
    for (gkey in settingsState.general) {
      if (settingsState.general[gkey].value.error) {
        return true
      }
    }
    let wkey: keyof WatermarkSettings
    for (wkey in settingsState.watermark) {
      if (settingsState.watermark[wkey].value.error) {
        return true
      }
    }
    return false
  }

  const classes = useStyles();

  // TODO fix TabPanel height
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
            <Button variant="outlined" onClick={(): void => { window.close()}}>Cancel</Button>
          </Grid>
        </Grid>
      </div>
    </form>
  )
}
