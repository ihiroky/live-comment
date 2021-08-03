import React from 'react'
import ReactDOM from 'react-dom'
import { LetsPoll } from 'poll'
import { createHash } from 'common'
import { SettingsV1 } from '../Settings'

declare global {
  interface Window {
    poll: {
      request(): Promise<SettingsV1>
    }
  }
}

window.poll.request().then((settings: SettingsV1): void => {
  ReactDOM.render(
    <LetsPoll
      title=""
      wsUrl={settings.general.url}
      room={settings.general.room}
      hash={createHash(settings.general.password)}
      onResultClosed={() => window.close()}
    />,
    document.getElementById('root')
  )
})
