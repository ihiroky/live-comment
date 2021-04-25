import React from 'react'

type ScreenProps = {
  name: string
  thumbnailDataUrl: string
}

declare global {
  interface Window {
    settingsProxy: {
      requestSettings: () => Promise<Record<string, string>>,
      postSettings: (settings: Record<string, string>) => Promise<void>,
      getScreenPropsList: () => Promise<ScreenProps[]>
    }
  }
}

export type Field = {
  value: string
  error: boolean
}

export interface GeneralSettings {
  url: Field
  room: Field
  password: Field
  duration: Field
  zoom: Field
  screen: Field
}

export interface WatermarkSettings {
  html: Field
  color: Field
}

type FieldState = {
  field: Field,
  setField: React.Dispatch<React.SetStateAction<Field>>
}

function useFieldValue(): FieldState {
  const [field, setField] = React.useState<Field>({
    value: '',
    error: false
  })
  return {
    field,
    setField
  }
}

type GeneralFieldsState = {
  [key in keyof GeneralSettings]: FieldState
}

type WatermarkFieldsState = {
  [key in keyof WatermarkSettings]: FieldState
}

export type SettingsState = {
  general: GeneralFieldsState
  watermark: WatermarkFieldsState
}

export function toGeneralSettings(state: GeneralFieldsState): GeneralSettings {
  return {
    url: state.url.field,
    room: state.room.field,
    password: state.password.field,
    duration: state.duration.field,
    zoom: state.zoom.field,
    screen: state.screen.field
  }
}

export function toWatermarkSettings(state: WatermarkFieldsState): WatermarkSettings {
  return {
    html: state.html.field,
    color: state.color.field
  }
}

export function uselSettingsState(): SettingsState {
  const general: GeneralFieldsState = {
    url: useFieldValue(),
    room: useFieldValue(),
    password: useFieldValue(),
    duration: useFieldValue(),
    zoom: useFieldValue(),
    screen: useFieldValue()
  }
  const watermark: WatermarkFieldsState = {
    html: useFieldValue(),
    color: useFieldValue()
  }


  React.useEffect((): void => {
    window.settingsProxy.requestSettings().then((settings: Record<string, string>): void => {
      console.log('requestSettings', settings)
      let gkey: keyof GeneralFieldsState
      for (gkey in general) {
        const state = general[gkey]
        state.setField({ value: settings[gkey], error: false })
        console.log(gkey, settings[gkey])
      }
      let wkey: keyof WatermarkFieldsState
      const wm = JSON.parse(settings.watermark)
      for (wkey in watermark) {
        const state = watermark[wkey]
        state.setField({ value: wm[wkey], error: false })
        console.log(wkey, wm[wkey])
      }
    })
  }, [])

  return {
    general,
    watermark
  }
}
