import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Routes, Route, BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { LoginForm } from './LoginForm'
import * as serviceWorker from './serviceWorker'
import { SoundPlayer } from './sound/SoundPlayer'
import { LogLevels, setDefaultLogLevel } from '@/common/Logger'

const wsUrl = process.env.NODE_ENV === 'production'
  ? `wss://${window.location.hostname}/app`
  : `ws://localhost:8080`
const apiUrl = process.env.NODE_ENV === 'production'
  ? `https://${window.location.hostname}/api`
  : `http://localhost:9080`
if (process.env.NODE_ENV !== 'production') {
  setDefaultLogLevel(LogLevels.DEBUG)
}
if (navigator.cookieEnabled) {
  document.cookie = 'room=; max-age=0; Secure'
  document.cookie = 'password=; max-age=0; Secure'
  document.cookie = 'autoScroll=; max-age=0; Secure'
  document.cookie = 'sendWithCtrlEnter=; max-age=0; Secure'
  document.cookie = 'openSoundPanel=; max-age=0; Secure'
}

// Too rich to render SoundPlayer here, should be independent?
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}
const root = createRoot(rootElement)
root.render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginForm apiUrl={apiUrl} />} />
        <Route path="/login" element={<LoginForm apiUrl={apiUrl} />} />
        <Route path="/comment" element={<App url={wsUrl} maxMessageCount={1024} />} />
        <Route path="/sound" element={<SoundPlayer url={apiUrl} />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
