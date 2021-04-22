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

export const CURRENT_VERSION = '0'

function isV0(settings: Settings): settings is SettingsV0 {
  return settings.version === '0'
}

export function parse(json: string): Record<string, string> {
  const s = JSON.parse(json)
  const result: Record<string, string> = loadDefault()
  if (isV0(s)) {
    result.url = s.url ?? 'ws://localhost:8080'
    result.room = s.room ?? ''
    result.password = s.password ?? ''
    result.duration = s.duration ?? '7'
    result.zoom = s.zoom ?? '100'
    result.screen = s.screen ?? ''
    return result
  }
  return loadDefault()
}

export function validate(record: Record<string, string>): void {
  if (!record.url) {
    throw new Error('No url exists.')
  }
  if (!record.room) {
    throw new Error('No room exists.')
  }
  if (!record.password) {
    throw new Error('No password exists.')
  }
  if (!record.duration) {
    throw new Error('No duration exists.')
  }
  if (!record.zoom) {
    throw new Error('No zoomFactor exists.')
  }
  if (!record.screen) {
    throw new Error('No screen exists.')
  }
}

export function loadDefault(): Record<string, string> {
  return {
    version: '0',
    url: 'ws://localhost:8080',
    room: '',
    password: '',
    duration: '7',
    zoom: '100',
    screen: ''
  }
}
