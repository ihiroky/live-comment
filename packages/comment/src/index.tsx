import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route } from 'react-router-dom'
import './index.css';
import { App } from './App';
import { LoginForm } from './LoginForm'
import * as serviceWorker from './serviceWorker';

const url = process.env.NODE_ENV === 'production'
  ? `wss://${window.location.hostname}/app`
  : `ws://localhost:8080/`

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Route path="/login" component={LoginForm} />
      <Route path="/comment" render={(): React.ReactNode => {
        return <App
          url={url}
          maxMessageCount={512}
        />
      }}/>
    </BrowserRouter>

  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
