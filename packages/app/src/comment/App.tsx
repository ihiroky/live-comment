import { Message } from '@/common/Message'
import { StrictMode, useEffect } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Comment } from './Comment'
import { LoginForm } from './LoginForm'
import { SoundPlayer } from './sound/SoundPlayer'
import { SelectRoom } from './SelectRoom'

const defaultOrigin = process.env.NODE_ENV === 'production'
  ? (process.env.LC_ORIGIN_URL || window.location.origin)
  : `http://localhost:8888`
const defaultWsUrl = process.env.NODE_ENV === 'production'
  ? (process.env.LC_WS_URL || `wss://${window.location.hostname}/app`)
  : `ws://localhost:8080`
const defaultApiUrl = process.env.NODE_ENV === 'production'
  ? (process.env.LC_API_URL || `https://${window.location.hostname}/api`)
  : `http://localhost:9080`

const allowPostCredentialOrigin = process.env.NODE_ENV === 'production'
  ? (process.env.LC_ALLOW_POST_CREDENTIAL_ORIGIN || 'chrome-extension://nelcmkfemkkbopgcgbmdoecfiodjocca')
  : 'chrome-extension://nelcmkfemkkbopgcgbmdoecfiodjocca'

type Props = {
  origin?: string
  wsUrl?: string
  apiUrl?: string
  logoRatio?: number
  onMount?: () => void
  onUnmount?: () => void
  onOpen?: () => void
  onClose?: (e: CloseEvent) => void
  onError?: (e: Event) => void
  onMessage?: (m: Message) => void
}

const isSoundPage = window.location.href.endsWith('/sound')

const AppRoutes = (props: Props): JSX.Element => {
  const origin = props.origin || defaultOrigin
  const wsUrl = props.wsUrl || defaultWsUrl
  const apiUrl = props.apiUrl || defaultApiUrl
  const navigate = useNavigate()
  // trim tail slash

  return (
    <Routes>
      <Route path='/' element={<Navigate replace to='/login' />} />
      <Route path='/login' element={<LoginForm origin={origin} apiUrl={apiUrl} logoRatio={props.logoRatio} navigate={navigate} />} />
      <Route path='/rooms' element={<SelectRoom apiUrl={apiUrl} navigate={navigate} allowPostCredentialOrigin={allowPostCredentialOrigin} />} />
      { !isSoundPage ? (
        <Route path='/comment' element={
          <Comment url={wsUrl} maxMessageCount={1024} navigate={navigate} {...props} />
        } />
      ) : (
        <Route path='/sound' element={<SoundPlayer url={apiUrl} />} />
      )}
    </Routes>
  )
}
const Router = (window.location.protocol === 'chrome-extension:' || window.location.protocol === 'file:')
  ? HashRouter
  : BrowserRouter

export const App = ({ onMount, onUnmount, ...props}: Props): JSX.Element => {
  useEffect((): (() => void) => {
    onMount?.()
    return (): void => {
      onUnmount?.()
    }
  }, [onMount, onUnmount])

  return (
    <StrictMode>
      <Router>
        <AppRoutes {...props} />
      </Router>
    </StrictMode>
  )
}
