import ReactDOM from 'react-dom'
import { Poll } from '@/poll/Poll'
import { createHash } from '@/common/utils'
import { SettingsV1 } from '../settings'

declare global {
  interface Window {
    poll: {
      request(): Promise<SettingsV1>
    }
  }
}

window.poll.request().then((settings: SettingsV1): void => {
  ReactDOM.render(
    <Poll
      title=""
      wsUrl={settings.general.url}
      room={settings.general.room}
      hash={createHash(settings.general.password)}
      onResultClosed={(): void => window.close()}
      onCanceled={(): void => window.close()}
    />,
    document.getElementById('root')
  )
})
