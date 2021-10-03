import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Route } from 'react-router-dom'
import { App } from './App'
import { LoginForm } from './LoginForm'
import { CookiesProvider } from 'react-cookie'
import * as serviceWorker from './serviceWorker'
import { SoundPlayer } from './sound/SoundPlayer'

const wsUrl = process.env.NODE_ENV === 'production'
  ? `wss://${window.location.hostname}/app`
  : `ws://localhost:8080/`
const httpUrl = process.env.NODE_ENV === 'production'
  ? `https://${window.location.hostname}/app`
  : `http://localhost:8080/`

// Too rich to render SoundPlayer here, should be independent?
ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Route path="/" exact component={LoginForm} />
      <Route path="/login" exact component={LoginForm} />
      <Route path="/comment" exact render={(): React.ReactNode => {
        return (
          <CookiesProvider>
            <App url={wsUrl} maxMessageCount={1024} />
          </CookiesProvider>
        )
      }}/>
      <Route path="/sound" exact render={(): React.ReactNode => {
        return (
          <CookiesProvider>
            <SoundPlayer url={httpUrl} />
          </CookiesProvider>
        )
      }}/>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
