import { useMemo } from 'react'
import { useCookies } from 'react-cookie'

export type CookieAccessor<N extends string> = {
  str: (name: N) => string | undefined
  bool: (name: N) => boolean | undefined
  num: (name: N) => number | undefined
  obj: <V>(name: N) => V | undefined
}

export type CookieModifier<N extends string> = {
  str: (name: N, value: string, expires?: Date) => void
  bool: (name: N, value: boolean, expires?: Date) => void
  num: (name: N, value: number, expires?: Date) => void
  obj: (name: N, value: unknown, expires?: Date) => void
  remove: (name: N) => void
}

export const FAR_ENOUGH = new Date()
FAR_ENOUGH.setUTCFullYear(2099)
FAR_ENOUGH.setUTCMonth(11)
FAR_ENOUGH.setUTCDate(31)
FAR_ENOUGH.setUTCHours(23)
FAR_ENOUGH.setUTCMinutes(59)
FAR_ENOUGH.setUTCSeconds(59)
FAR_ENOUGH.setUTCMilliseconds(999)

function cookieOptions(expires?: Date): { secure: true, sameSite: 'strict', expires?: Date } {
  return {
    secure: true,
    sameSite: 'strict',
    expires
  }
}

export function useNamedCookies<N extends string>(names: readonly N[]): [CookieAccessor<N>, CookieModifier<N>] {
  const [cookies, setCookie, removeCookie] = useCookies([...names])
  const getter = useMemo(() => ({
    str: (name: N): string | undefined => {
      return cookies[name]
    },
    bool: (name: N): boolean | undefined => {
      const c = cookies[name]
      return (c !== undefined) ? c !== '' : undefined
    },
    num: (name: N): number | undefined => {
      const c = cookies[name]
      return (c !== undefined) ? Number(cookies[name]) : undefined
    },
    obj: <V>(name: N): V | undefined => {
      const c = cookies[name]
      return (c !== undefined) ? JSON.parse(cookies[name]) : undefined
    },
  }), [cookies])
  const modifier = useMemo(() => ({
    str: (name: N, value: string, expires?: Date): void => {
      setCookie(name, value, cookieOptions(expires))
    },
    bool: (name: N, value: boolean, expires?: Date): void => {
      setCookie(name, value ? 't' : '', cookieOptions(expires))
    },
    num: (name: N, value: number, expires?: Date): void => {
      setCookie(name, Number(value).toString(), cookieOptions(expires))
    },
    obj: (name: N, value: unknown, expires?: Date): void => {
      setCookie(name, JSON.stringify(value), cookieOptions(expires))
    },
    remove: (name: N): void => {
      removeCookie(name)
    },
  }), [setCookie, removeCookie])
  return [getter, modifier]
}
