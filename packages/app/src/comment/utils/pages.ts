import { AcnMessage, Message } from '@/common/Message'
import { fetchWithTimeout } from '@/common/utils'
import { NavigateFunction } from 'react-router-dom'

export function gotoLoginPage(navigate?: NavigateFunction): void {
  if (navigate) {
    navigate('/login')
  } else {
    window.location.href = './login'
  }

}

export function gotoCommentPage(navigate?: NavigateFunction): void {
  if (navigate) {
    navigate('/comment')
  } else {
    window.location.href = './comment'
  }
}

export function getSoundPageUrl(navigate?: NavigateFunction): string {
  if (navigate) {
    const loc = window.location
    return loc.href.endsWith('#/comment') ? `${loc.origin}/${loc.pathname}#/sound` : `${loc.origin}/sound`
  }
  return './sound'
}

export function login(
  apiUrl: string,
  room: string,
  hash: string,
  keepLogin: boolean,
): Promise<Message> {
  const message: AcnMessage = {
    type: 'acn',
    room: room,
    longLife: keepLogin,
    hash: hash,
  }
  return fetchWithTimeout(
    `${apiUrl.replace(/\/+$/, '')}/login`,
    {
      method: 'POST',
      cache: 'no-store',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    },
    3000
  ).then((res: Response): Promise<Message> =>
    res.ok
      ? res.json()
      : Promise.resolve({ type: 'error', error: 'ERROR', message: 'Fetch failed' })
  )
}

export function goto(url: string): void {
  window.location.href = url
}

export function getToken(): string | null {
  return window.localStorage.getItem('token')
}

export function setToken(token: string): void {
  window.localStorage.setItem('token', token)
}

export function removeToken(): void {
  window.localStorage.removeItem('token')
}
