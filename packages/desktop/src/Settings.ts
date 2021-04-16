interface Settings {
  version: string
}

interface SettingsV0 extends Settings {
  version: '0'
  url: string
  room: string
  password: string
  messageDuration: string
}

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
    result.messageDuration = s.messageDuration ?? '7'
    return result
  }
  return loadDefault()
}

export function loadDefault(): Record<string, string> {
  return {
    version: '0',
    url: 'ws://localhost:8080',
    room: '',
    password: '',
    messageDuration: '7'
  }
}
