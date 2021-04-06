import React, { ReactNode } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Route, RouteComponentProps } from 'react-router-dom'
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import queryString from 'query-string'

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <Route render={(props: RouteComponentProps): ReactNode => {
        const qs = queryString.parse(props.location.search)
        const marqueeDuration = Number(qs['marqueeDuration'] + '000')
        const url = String(qs['url'])
        console.info(`marqueeDuration: ${marqueeDuration}, url: ${url}`)
        return <App marqueeDuration={marqueeDuration} url={url} />
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
