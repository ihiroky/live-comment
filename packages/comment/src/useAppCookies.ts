import { useMemo } from 'react'
import { useCookies } from 'react-cookie'

const Names = [
  'room',
  'password',
  'autoScroll',
  'sendWithCtrlEnter',
  'openSoundPanel',
] as const
export type Name = typeof Names[number]

type AppCookies = {
  str: (name: Name) => string | undefined
  bool: (name: Name) => boolean | undefined
}

type AppModifyCookies = {
  str: (name: Name, value: string, expires?: Date) => void
  bool: (name: Name, value: boolean, expires?: Date) => void
  remove: (name: Name) => void
}

export const FAR_ENOUGH = new Date()
FAR_ENOUGH.setUTCFullYear(2099)
FAR_ENOUGH.setUTCMonth(11)
FAR_ENOUGH.setUTCDate(31)
FAR_ENOUGH.setUTCHours(23)
FAR_ENOUGH.setUTCMinutes(59)
FAR_ENOUGH.setUTCSeconds(59)
FAR_ENOUGH.setUTCMilliseconds(999)


export function useAppCookies(): [AppCookies, AppModifyCookies] {
  const [cookies, setCookie, removeCookie] = useCookies([...Names])
  const getter = useMemo(() => ({
    str: (name: Name): string | undefined => {
      return cookies[name]
    },
    bool: (name: Name): boolean | undefined => {
      const c = cookies[name]
      return (c !== undefined) ? c !== '' : undefined
    },
  }), [cookies])
  const modifier = useMemo(() => ({
    str: (name: Name, value: string, expires?: Date): void => {
      setCookie(name, value, {
        secure: true,
        sameSite: 'strict',
        expires,
      })
    },
    bool: (name: Name, value: boolean, expires?: Date): void => {
      setCookie(name, value ? 't' : '', {
        secure: true,
        sameSite: 'strict',
        expires,
      })
    },
    remove: (name: Name): void => {
      removeCookie(name)
    },
  }), [setCookie, removeCookie])
  return [getter, modifier]
}
