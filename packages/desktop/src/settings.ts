type Settings = {
  version: string
}

export const CURRENT_VERSION = '1'

// TODO Retain proper type

type SettingsV0 = Settings & {
  version: '0'
  url: string
  room: string
  password: string
  duration: string
  zoom: string
  screen: string
}

export type SettingsV1 = Settings & {
  version: typeof CURRENT_VERSION
  general: {
    url: string
    room: string
    password: string
    duration: number
    zoom: number
    screen: number
    fontColor: string
    fontBorderColor: string
    gpu: boolean
  }
  watermark: {
    html: string
    opacity: number
    color: string
    fontSize: string
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    offset: string
    noComments: boolean
  }
}

function isV0(settings: Settings): settings is SettingsV0 {
  return settings.version === '0'
}

function isV1(settings: Settings): settings is SettingsV1 {
  return settings.version === CURRENT_VERSION
}

function setDefaultIfNotMatchType<T>(key: string, obj: Record<string, T>, defaultObj: Record<string, T>): void {
  const defalutValue = defaultObj[key]
  if (typeof obj[key] !== typeof defalutValue) {
    obj[key] = defalutValue
  }
}

export function loadDefault(): SettingsV1 {
  return {
    version: '1',
    general: {
      url: 'ws://localhost:8080',
      room: '',
      password: '',
      duration: 9,
      zoom: 100,
      screen: 0,
      fontColor: '#111111',
      fontBorderColor: '#cccccc',
      gpu: process.platform === 'win32'
    },
    watermark: {
      html: '',
      opacity: 0.7,
      color: '#333333',
      fontSize: '64px',
      position: 'bottom-right',
      offset: '3%',
      noComments: false
    }
  }
}


export function parse(json: string): SettingsV1 {
  const s = JSON.parse(json)
  const d = loadDefault()
  if (isV1(s)) {
    let gkey: keyof SettingsV1['general']
    for (gkey in d.general) {
      setDefaultIfNotMatchType(gkey, s.general, d.general)
    }
    let wkey: keyof SettingsV1['watermark']
    for (wkey in d.watermark) {
      setDefaultIfNotMatchType(wkey, s.watermark, d.watermark)
    }
    return s
  }
  if (isV0(s)) {
    return {
      version: '1',
      general: {
        url: s.url ?? d.general.url,
        room: s.room ?? d.general.room,
        password: s.password ?? d.general.password,
        duration: !isNaN(Number(s.duration)) ? Number(s.duration) : d.general.duration,
        zoom: !isNaN(Number(s.zoom)) ? Number(s.zoom) : d.general.zoom,
        screen: !isNaN(Number(s.screen)) ? Number(s.screen) : d.general.screen,
        fontColor: d.general.fontColor,
        fontBorderColor: d.general.fontBorderColor,
        gpu: d.general.gpu,
      },
      watermark: d.watermark,
    }
  }
  return loadDefault()
}
