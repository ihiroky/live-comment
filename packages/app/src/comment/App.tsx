import { Message } from '@/common/Message'
import { StrictMode } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Comment } from './Comment'
import { LoginForm } from './LoginForm'
import { SoundPlayer } from './sound/SoundPlayer'

const wsUrl = process.env.NODE_ENV === 'production'
  ? `wss://${window.location.hostname}/app`
  : `ws://localhost:8080`
const apiUrl = process.env.NODE_ENV === 'production'
  ? `https://${window.location.hostname}/api`
  : `http://localhost:9080`

type Props = {
  onWsOpen?: () => void
  onWsClose?: (e: CloseEvent) => void
  onWsError?: (e: Event) => void
  onWsMessage?: (m: Message) => void
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
export const App = (): JSX.Element => {
  return (
    <StrictMode>
      <Router>
        <AppRoutes />
      </Router>
    </StrictMode>
  )
}
