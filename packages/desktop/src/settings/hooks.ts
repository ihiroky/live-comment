import React from 'react'
import {
  Settings,
  Value,
  ValueState,
  WatermarkPosition,
  GeneralSettingsState,
  WatermarkSettingsState,
  SettingsState
} from './types'
import { getLogger } from 'common'

const log = getLogger('settings/hooks')

function useValue<T>(initialValue: T): ValueState<T> {
  const [value, setValue] = React.useState<Value<T>>({
    data: initialValue,
    error: false
  })
  return {
    value,
    setValue
  }
}


export function useSettingsState(): SettingsState {
  const general: GeneralSettingsState = {
    url: useValue(''),
    room: useValue(''),
    password: useValue(''),
    duration: useValue('7'),
    zoom: useValue('100'),
    screen: useValue(0)
  }
  const watermark: WatermarkSettingsState = {
    html: useValue(''),
    opacity: useValue('0.7'),
    color: useValue('black'),
    fontSize: useValue('64px'),
    position: useValue<WatermarkPosition>('bottom-right'),
    offset: useValue('3%'),
    noComments: useValue<boolean>(false)
  }

  React.useEffect((): void => {
    window.settings.requestSettings().then((settings: Settings): void => {
      log.debug('[requestSettings]', settings)

      const g = settings.general
      general.url.setValue({ data: g.url, error: false })
      general.room.setValue({ data: g.room, error: false })
      general.password.setValue({ data: g.password, error: false })
      general.duration.setValue({ data: String(g.duration), error: false })
      general.zoom.setValue({ data: String(g.zoom), error: false })
      general.screen.setValue({ data: g.screen, error: false })

      const w = settings.watermark
      watermark.html.setValue({ data: w.html, error: false })
      watermark.opacity.setValue({ data: String(w.opacity), error: false })
      watermark.color.setValue({ data: w.color, error: false })
      watermark.fontSize.setValue({ data: w.fontSize, error: false })
      watermark.position.setValue({ data: w.position, error: false })
      watermark.offset.setValue({ data: w.offset, error: false})
      watermark.noComments.setValue({ data: w.noComments, error: false })
    })
  }, [])

  return {
    general,
    watermark
  }
}