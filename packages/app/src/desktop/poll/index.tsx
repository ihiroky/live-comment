import { createRoot } from 'react-dom/client'
import { Poll } from '@/poll/Poll'
import { createHash } from '@/common/utils'
import { SettingsV1 } from '../settings'
import { StrictMode } from 'react'

declare global {
  interface Window {
    poll: {
      request(): Promise<SettingsV1>
    }
  }
}

window.poll.request().then((settings: SettingsV1): void => {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }
  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <Poll
        title=""
        wsUrl={settings.general.url}
        room={settings.general.room}
        hash={createHash(settings.general.password)}
        onResultClosed={(): void => window.close()}
        onCanceled={(): void => window.close()}
      />
    </StrictMode>
  )
})
