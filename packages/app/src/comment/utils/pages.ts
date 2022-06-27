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
