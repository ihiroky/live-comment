import { useState, useCallback, useEffect, FormEvent } from 'react'
import {
  Settings,
  Value,
  ValueState,
  WatermarkPosition,
  GeneralSettingsState,
  WatermarkSettingsState,
  SettingsState,
  GeneralSettings,
  WatermarkSettings,
  isWatermarkPosition
} from './types'
import { getLogger } from 'common'

const log = getLogger('settings/hooks')

function useValue<T>(initialValue: T): ValueState<T> {
  const [value, setValue] = useState<Value<T>>({
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
    duration: useValue('9'),
    zoom: useValue('100'),
    screen: useValue(0),
    fontColor: useValue('#111111'),
    fontBorderColor: useValue('#cccccc'),
    gpu: useValue<boolean>(false),
  }
  const watermark: WatermarkSettingsState = {
    html: useValue(''),
    opacity: useValue('0.7'),
    color: useValue('black'),
    fontSize: useValue('64px'),
    position: useValue<WatermarkPosition>('bottom-right'),
    offset: useValue('3%'),
    noComments: useValue<boolean>(false),
  }

  useEffect((): void => {
    window.settings.requestSettings().then((settings: Settings): void => {
      log.debug('[requestSettings]', settings)

      const g = settings.general
      general.url.setValue({ data: g.url, error: false })
      general.room.setValue({ data: g.room, error: false })
      general.password.setValue({ data: g.password, error: false })
      general.duration.setValue({ data: String(g.duration), error: false })
      general.zoom.setValue({ data: String(g.zoom), error: false })
      general.screen.setValue({ data: g.screen, error: false })
      general.fontColor.setValue({ data: g.fontColor, error: false })
      general.fontBorderColor.setValue({ data: g.fontBorderColor, error: false})
      general.gpu.setValue({ data: g.gpu, error: false })

      const w = settings.watermark
      watermark.html.setValue({ data: w.html, error: false })
      watermark.opacity.setValue({ data: String(w.opacity), error: false })
      watermark.color.setValue({ data: w.color, error: false })
      watermark.fontSize.setValue({ data: w.fontSize, error: false })
      watermark.position.setValue({ data: w.position, error: false })
      watermark.offset.setValue({ data: w.offset, error: false})
      watermark.noComments.setValue({ data: w.noComments, error: false })
    })
  // Request initial values on initialization only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    general,
    watermark
  }
}

export function useOnGeneralSettingsUpdate(
  g: GeneralSettingsState
): (key: keyof GeneralSettings, value: string, error: boolean) => void {
  return useCallback((key: keyof GeneralSettings, value: string, error: boolean): void => {
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
  }, [g])
}

export function useOnWatermarkSettingsUpdate(
  w: WatermarkSettingsState
): (key: keyof WatermarkSettings, value: string, error: boolean) => void {
  return useCallback((key: keyof WatermarkSettings, value: string, error: boolean): void => {
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
        break
      default:
        throw new Error(`Unexpected key: ${key}`)
    }
  }, [w])
}

export function useOnSubmit(
  settingsState: SettingsState
): (e: FormEvent<HTMLFormElement>) => Promise<void> {
  return useCallback((e: FormEvent<HTMLFormElement>): Promise<void> => {
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
    return window.settings.postSettings(settings).then(() => window.close())
  }, [settingsState])
}

export function useHasError(settingsState: SettingsState): () => boolean {
  return useCallback((): boolean => {
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
  }, [settingsState])
}