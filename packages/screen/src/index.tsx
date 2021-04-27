import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, RouteComponentProps } from 'react-router-dom'
import './index.css';
import { App } from './App';
import { createHash } from 'common'
import * as serviceWorker from './serviceWorker';
import queryString from 'query-string'

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Route render={(props: RouteComponentProps): ReactNode => {
        const qs = queryString.parse(props.location.search)
        console.info('parameters:', qs)
        const watermark = qs['watermark'] as string
        const appProps = {
          duration: Number(qs['duration']) * 1000,
          url: String(qs['url']),
          room: String(qs['room']),
          hash: createHash(String(qs['password'])),
          watermark: watermark ? JSON.parse(watermark) : undefined
        }
        console.log('index watermark', appProps.watermark)
        return <App { ...appProps } />
      }}
    />
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
