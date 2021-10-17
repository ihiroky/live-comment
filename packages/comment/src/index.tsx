import React from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Route } from 'react-router-dom'
import { App } from './App'
import { LoginForm } from './LoginForm'
import * as serviceWorker from './serviceWorker'
import { SoundPlayer } from './sound/SoundPlayer'

const wsUrl = process.env.NODE_ENV === 'production'
  ? `wss://${window.location.hostname}/app`
  : `ws://localhost:8080/`
const apiUrl = process.env.NODE_ENV === 'production'
  ? `https://${window.location.hostname}/api`
  : `http://localhost:9080/`

// Too rich to render SoundPlayer here, should be independent?
ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Route path="/" exact render={() =>  <LoginForm apiUrl={apiUrl} />} />
      <Route path="/login" exact render={() =>  <LoginForm apiUrl={apiUrl} />} />
      <Route path="/comment" exact render={() => <App url={wsUrl} maxMessageCount={1024} />} />
      <Route path="/sound" exact render={() => <SoundPlayer url={apiUrl} />} />
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
