import { useCookies } from 'react-cookie'

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useAuthCookies() {
  return useCookies(['room', 'password'])
}
