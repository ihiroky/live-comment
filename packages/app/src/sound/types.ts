import { ApplicationMessage } from '@/common/Message'
import { isObject } from '@/common/utils'

export type PlaySoundMessage = ApplicationMessage & {
  cmd: 'sound/play'
  id: string
}

export const playSoundCommand = 'sound/play'

export function isPlaySoundMessage(obj: unknown): obj is PlaySoundMessage {
  // type: 'app', cmd: 'sound/play', id
  return isObject(obj) &&
    obj.type === 'app' &&
    obj.cmd === playSoundCommand &&
    typeof obj.id === 'string'
}