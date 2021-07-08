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

const log = getLogger('settings/index')

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
    screen: state.screen.value,
    fontColor: state.fontColor.value,
    fontBorderColor: state.fontBorderColor.value,
    gpu: state.gpu.value,
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
    switch (key) {
      case 'url':
      case 'room':
      case 'password':
      case 'duration':
      case 'zoom':
      case 'fontColor':
      case 'fontBorderColor':
        g[key].setValue({ data: value, error })
        break
      case 'gpu':
        g[key].setValue({ data: value.toLowerCase() === 'true', error })
        break
      case 'screen':
        g[key].setValue({ data: Number(value), error })
        break
      default:
        throw new Error(`Unexpected key: ${key}`)
    }
  }

  function onWatermarkSettingsUpdate(key: keyof WatermarkSettings, value: string, error: boolean): void {
    const w = settingsState.watermark
    switch (key) {
      case 'html':
      case 'opacity':
      case 'color':
      case 'fontSize':
      case 'offset':
        w[key].setValue({ data: value, error })
        break
      case 'position':
        if (!isWatermarkPosition(value)) {
          throw new Error(`Unexpeced value of position: ${value}`)
        }
        w[key].setValue({ data: value, error })
        break
      case 'noComments':
        w[key].setValue({ data: value.toLowerCase() === 'true', error })
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
        screen: g.screen.value.data,
        fontColor: g.fontColor.value.data,
        fontBorderColor: g.fontBorderColor.value.data,
        gpu: g.gpu.value.data,
      },
      watermark: {
        html: w.html.value.data,
        opacity: Number(w.opacity.value.data),
        color: w.color.value.data,
        fontSize: w.fontSize.value.data,
        position: w.position.value.data,
        offset: w.offset.value.data,
        noComments: w.noComments.value.data,
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
            <Button variant="outlined" onClick={() => window.close()}>Cancel</Button>
          </Grid>
        </Grid>
      </div>
    </form>
  )
}
