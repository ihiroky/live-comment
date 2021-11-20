import { useMemo } from 'react'
import jwtDecode, { JwtPayload } from 'jwt-decode'

export function useToken(): { value: string, payload: { room: string }} {
  return useMemo((): { value: string, payload: { room: string }} => {
    const token = window.localStorage.getItem('token')
    if (!token) {
      return { value: '', payload: { room: '' } }
    }
    const payload = jwtDecode<JwtPayload & { room: string }>(token)
    if (!payload || typeof payload === 'string') {
      return { value: '', payload: { room: '' } }
    }
    return {
      value: token,
      payload: { room: payload.room }
    }
  }, [])
}
