import { FC, StrictMode, useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { SettingsV1 } from './settings'
import { createHash } from '@/common/utils'
import { getLogger } from '@/common/Logger'
import { createReconnectableWebSocket, ReconnectableWebSocket, useReconnectableWebSocket } from '@/wscomp/rws'
import { Poll } from '@/poll/Poll'
import { SettingsForm } from './settings/SettingsForm'
import { MessageScreen, PublishableMessageSource, createMessageSource } from '@/screen/MessageScreen'
import { onOpen, onClose } from './screenEventListeners'

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

const log = getLogger('renderer')

export function screenMain(): void {
  window.main.request().then((settings: SettingsV1): void => {
    const App: FC = (): JSX.Element => {
      const rws = useReconnectableWebSocket(settings.general.url, settings.watermark.noComments)
      const messageSource = useMemo((): PublishableMessageSource => createMessageSource(), [])
      const onRwsOpen = useCallback((): void => {
        if (!rws) {
          return
        }
        const hash = createHash(settings.general.password)
        onOpen(rws, settings.general.room, hash, messageSource)
      }, [rws, messageSource])
      const onRwsClose = useCallback((ev: CloseEvent): void => {
        if (!rws) {
          return
        }
        onClose(rws, ev, messageSource)
      }, [rws, messageSource])

      useEffect((): (() => void) => {
        if (!rws) {
          return () => undefined
        }
        rws.addEventListener('open', onRwsOpen)
        rws.addEventListener('close', onRwsClose)
        rws.addEventListener('error', log.error)
        rws.addEventListener('message', messageSource.publish)
        return (): void => {
          rws.removeEventListener('open', onRwsOpen)
          rws.removeEventListener('close', onRwsClose)
          rws.removeEventListener('error', log.error)
          rws.removeEventListener('message', messageSource.publish)
        }
      }, [rws, messageSource, onRwsOpen, onRwsClose])

      return (
        <StrictMode>
          <MessageScreen
            duration={settings.general.duration * 1000}
            color={settings.general.fontColor}
            fontBorderColor={settings.general.fontBorderColor}
            watermark={settings.watermark}
            messageSource={messageSource}
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