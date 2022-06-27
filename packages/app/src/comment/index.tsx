import { createRoot } from 'react-dom/client'
import * as serviceWorker from './serviceWorker'
import { LogLevels, setDefaultLogLevel } from '@/common/Logger'
import { App } from './App'

if (process.env.NODE_ENV !== 'production') {
  setDefaultLogLevel(LogLevels.DEBUG)
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}
const root = createRoot(rootElement)
root.render(<App/>)

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
