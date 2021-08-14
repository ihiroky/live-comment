import { useCookies } from 'react-cookie'

export function useAuthCookies() {
  return useCookies(['room', 'password'])
}
