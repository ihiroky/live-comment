import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Route } from 'react-router-dom'
import './index.css'
import { App } from './App'
import { LoginForm } from './LoginForm'
import { CookiesProvider } from 'react-cookie'
import * as serviceWorker from './serviceWorker'

import { SoundPlayer } from './sound/SoundPlayer'

const url = process.env.NODE_ENV === 'production'
  ? `wss://${window.location.hostname}/app`
  : `ws://localhost:8080/`

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Route path="/" exact component={LoginForm} />
      <Route path="/login" exact component={LoginForm} />
      <Route path="/comment" exact render={(): React.ReactNode => {
        return (
          <CookiesProvider>
            <App url={url} maxMessageCount={1024} />
          </CookiesProvider>
        )
      }}/>
      <Route path="/sound" exact render={(): React.ReactNode => {
        return <SoundPlayer
          room="test"
          hash="ee26b0dd4af7e749aa1a8ee3c10ae9923f618980772e473f8819a5d4940e0db27ac185f8a0e1d5f84f88bc887fd67b143732c304cc5fa9ad8e6f57f50028a8ff"
          protocolHost="http://localhost:8080"
        />
      }}/>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
