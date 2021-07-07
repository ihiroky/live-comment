import React from 'react'
import { SettingsV1 } from '../Settings'

export type Settings = SettingsV1

type ScreenProps = Readonly<{
  name: string
  thumbnailDataUrl: string
}>

declare global {
  interface Window {
    settings: {
      requestSettings: () => Promise<SettingsV1>
      postSettings: (settings: SettingsV1) => Promise<void>
      getScreenPropsList: () => Promise<ScreenProps[]>
    }
  }
}

export type Value<T> = Readonly<{
  data: T
  error: boolean
}>

export type GeneralSettings = Readonly<{
  url: Value<string>
  room: Value<string>
  password: Value<string>
  duration: Value<string>
  zoom: Value<string>
  screen: Value<number>
  fontColor: Value<string>
  fontBorderColor: Value<string>
}>

export const WatermarkPositions = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right'
] as const

export type WatermarkPosition = typeof WatermarkPositions[number]

export function isWatermarkPosition(v: unknown): v is WatermarkPosition {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return WatermarkPositions.includes(v as any)
}


export type WatermarkSettings = Readonly<{
  html: Value<string>
  opacity: Value<string>
  color: Value<string>
  fontSize: Value<string>
  position: Value<WatermarkPosition>
  offset: Value<string>,
  noComments: Value<boolean>,
}>

export type ValueState<T> = Readonly<{
  value: Value<T>,
  setValue: React.Dispatch<React.SetStateAction<Value<T>>>
}>

export type GeneralSettingsState = Readonly<{
  url: ValueState<string>
  room: ValueState<string>
  password: ValueState<string>
  duration: ValueState<string>
  zoom: ValueState<string>
  screen: ValueState<number>
  fontColor: ValueState<string>
  fontBorderColor: ValueState<string>
}>

export type WatermarkSettingsState = Readonly<{
  html: ValueState<string>
  opacity: ValueState<string>
  color: ValueState<string>
  fontSize: ValueState<string>
  position: ValueState<WatermarkPosition>
  offset: ValueState<string>,
  noComments: ValueState<boolean>,
}>

export type SettingsState = Readonly<{
  general: GeneralSettingsState
  watermark: WatermarkSettingsState
}>
