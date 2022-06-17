import { FC, StrictMode, useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Screen } from '@/screen/Screen'
import { SettingsV1 } from './settings'
import { createHash } from '@/common/utils'
import { createReconnectableWebSocket, ReconnectableWebSocket, useReconnectableWebSocket } from '@/wscomp/rws'
import { Poll } from '@/poll/Poll'
import { SettingsForm } from './settings/SettingsForm'

declare global {
  interface Window {
    main: {
      request(): Promise<SettingsV1>
    }
    poll: {
      request(): Promise<SettingsV1>
    }
  }
}

export function screenMain(): void {
  window.main.request().then((settings: SettingsV1): void => {
    const App: FC = (): JSX.Element => {
      const rws = useReconnectableWebSocket(settings.general.url, settings.watermark.noComments)

      return (
        <StrictMode>
          <Screen
            room={settings.general.room}
            hash={createHash(settings.general.password)}
            duration={settings.general.duration * 1000}
            color={settings.general.fontColor}
            fontBorderColor={settings.general.fontBorderColor}
            watermark={settings.watermark}
            rws={rws}
          />
        </StrictMode>
      )
    }
    const rootElement = document.getElementById('root')
    if (!rootElement) {
      throw new Error('Root element not found')
    }
    const root = createRoot(rootElement)
    root.render(<App />)
  })

}

export function pollMain(): void {
  window.poll.request().then((settings: SettingsV1): void => {
    const App: FC = (): JSX.Element => {
      const [rws, setRws] = useState<ReconnectableWebSocket | null>(null)
      const onCreated = useCallback((): void => {
        const rws = createReconnectableWebSocket(settings.general.url)
        setRws(rws)
      }, [])
      const onPollClosed = useCallback((): void => {
        if (rws) {
          rws.close()
        }
      }, [rws])

      return (
        <StrictMode>
          <Poll
            title=""
            room={settings.general.room}
            hash={createHash(settings.general.password)}
            rws={rws}
            onResultClosed={(): void => window.close()}
            onCanceled={(): void => window.close()}
            onCreated={onCreated}
            onPollClosed={onPollClosed}
          />
        </StrictMode>
      )
    }

    const rootElement = document.getElementById('root')
    if (!rootElement) {
      throw new Error('Root element not found')
    }
    const root = createRoot(rootElement)
    root.render(<App />)
  })
}

export function settingsMain(): void {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found')
  }
  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <SettingsForm />
    </StrictMode>
  )
}