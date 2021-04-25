interface Settings {
  version: string
}

// TODO Retain proper type

interface SettingsV0 extends Settings {
  version: '0'
  url: string
  room: string
  password: string
  duration: string
  zoom: string,
  screen: string
}

export interface SettingsV1 extends Settings {
  version: '1'
  general: {
    url: string
    room: string
    password: string
    duration: string
    zoom: string,
    screen: string
  },
  watermark: {
    html: string
    color: string
  }
}

export const CURRENT_VERSION = '0'

function isV0(settings: Settings): settings is SettingsV0 {
  return settings.version === '0'
}

function isV1(settings: Settings): settings is SettingsV1 {
  return settings.version === '1'
}

export function toRecord(settings: SettingsV1): Record<string, string> {
  return {
    url: settings.general.url,
    room: settings.general.room,
    password: settings.general.password,
    duration: settings.general.duration,
    zoom: settings.general.zoom,
    screen: settings.general.screen,
    watermark: JSON.stringify(settings.watermark),
  }
}

export function fromRecord(settings: Record<string, string>): SettingsV1 {
  return {
    version: '1',
    general: {
      url: settings.url,
      room: settings.room,
      password: settings.password,
      duration: settings.duration,
      zoom: settings.zoom,
      screen: settings.screen
    },
    watermark: JSON.parse(settings.watermark)
  }
}

export function parse(json: string): SettingsV1 {
  const s = JSON.parse(json)
  if (isV1(s)) {
    return s
  }
  if (isV0(s)) {
    return {
      version: '1',
      general: {
        url: s.url ?? 'ws://localhost:8080',
        room: s.room ?? '',
        password: s.password ?? '',
        duration: s.duration ?? '7',
        zoom: s.zoom ?? '100',
        screen: s.screen ?? ''
      },
      watermark: {
        html: '',
        color: '#333333'
      }
    }
  }
  return loadDefault()
}

export function loadDefault(): SettingsV1 {
  return {
    version: '1',
    general: {
      url: 'ws://localhost:8080',
      room: '',
      password: '',
      duration: '7',
      zoom: '100',
      screen: ''
    },
    watermark: {
      html: '',
      color: '#333333'
    }
  }
}
