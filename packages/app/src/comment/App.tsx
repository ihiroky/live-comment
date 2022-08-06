import { Message } from '@/common/Message'
import { StrictMode, useEffect } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Comment } from './Comment'
import { LoginForm } from './LoginForm'
import { SoundPlayer } from './sound/SoundPlayer'

const wsUrl = process.env.NODE_ENV === 'production'
  ? (process.env.LC_WS_URL || `wss://${window.location.hostname}/app`)
  : `ws://localhost:8080`
const apiUrl = process.env.NODE_ENV === 'production'
  ? (process.env.LC_API_URL || `https://${window.location.hostname}/api`)
  : `http://localhost:9080`

type Props = {
  onMount?: () => void
  onUnmount?: () => void
  onOpen?: () => void
  onClose?: (e: CloseEvent) => void
  onError?: (e: Event) => void
  onMessage?: (m: Message) => void
}

const AppRoutes = (props: Props): JSX.Element => {
  const navigate = useNavigate()
  return (
    <Routes>
      <Route path='/' element={<Navigate replace to='/login' />} />
      <Route path='/login' element={<LoginForm apiUrl={apiUrl} navigate={navigate} />} />
      <Route path='/comment' element={
        <Comment url={wsUrl} maxMessageCount={1024} navigate={navigate} {...props} />
      } />
      <Route path='/sound' element={<SoundPlayer url={apiUrl} />} />
    </Routes>
  )
}
const Router = window.location.protocol === 'chrome-extension:' ? HashRouter : BrowserRouter
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
