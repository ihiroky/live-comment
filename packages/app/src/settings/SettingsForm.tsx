import { useState, ReactNode, ChangeEvent } from 'react'
import { AppBar, Tabs, Tab, Box, Grid, Button } from '@mui/material'
import { styled } from '@mui/system'
import { General } from './General'
import { Watermark } from './Watermark'
import {
  useHasError,
  useOnGeneralSettingsUpdate,
  useOnSubmit,
  useOnWatermarkSettingsUpdate,
  useSettingsState
} from './hooks'
import {
  GeneralSettings,
  WatermarkSettings,
  GeneralSettingsState,
  WatermarkSettingsState,
  SettingsState,
  SettingsRepository,
} from './types'
import { getLogger } from '@/common/Logger'

type TabPanelProps = {
  children?: ReactNode
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

const Form = styled('form')({
  flexGrow: 1,
  overflow: 'hidden',
})

const StyledTabs = styled(Tabs)({
  background: 'white',
})

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

type SettingsFormProps = {
  useStandaloneSettings: boolean
  repository: SettingsRepository
}

export const SettingsForm = (props: SettingsFormProps): JSX.Element => {

  const settingsState: SettingsState = useSettingsState(props.repository)
  const [value, setValue] = useState<number>(0)

  // eslint-disable-next-line @typescript-eslint/ban-types
  function onChange(e: ChangeEvent<{}>, newValue: number): void {
    log.debug('[onChange]', value, newValue)
    setValue(newValue)
  }

  const onGeneralSettingsUpdate = useOnGeneralSettingsUpdate(settingsState.general)
  const onWatermarkSettingsUpdate = useOnWatermarkSettingsUpdate(settingsState.watermark)
  const onSubmit = useOnSubmit(settingsState, props.repository)
  const hasError = useHasError(settingsState)

  // TODO fix TabPanel height
  return (
    <Form onSubmit={onSubmit}>
      <AppBar position="static">
        <StyledTabs value={value} onChange={onChange} aria-label="setting tabs">
          <Tab label="General" { ...accessibilityProps(0) } />
          <Tab label="Watermark" { ...accessibilityProps(1) } />
        </StyledTabs>
      </AppBar>
      <TabPanel value={value} index={0}>
        <General
          useStandaloneSettings={props.useStandaloneSettings}
          getScreenPropsList={props.repository.getScreenPropsList}
          onUpdate={onGeneralSettingsUpdate}
          { ...toGeneralSettings(settingsState.general) }
        />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Watermark
          onUpdate={onWatermarkSettingsUpdate}
          { ...toWatermarkSettings(settingsState.watermark) }
        />
      </TabPanel>
      <div>
        <Grid container alignItems="center" justifyContent="center" spacing={3}>
          <Grid item>
            <Button variant="outlined" type="submit" disabled={hasError()}>OK</Button>
          </Grid>
          <Grid item>
            <Button variant="outlined" onClick={(): void => window.close()}>Cancel</Button>
          </Grid>
        </Grid>
      </div>
    </Form>
  )
}
