import { FC, StrictMode, useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { SettingsV1 } from './settings'
import { createHash, fetchWithTimeout } from '@/common/utils'
import { getLogger } from '@/common/Logger'
import { createReconnectableWebSocket, ReconnectableWebSocket } from '@/wscomp/rws'
import { Poll } from '@/poll/Poll'
import { SettingsForm } from '@/settings/SettingsForm'
import { ScreenProps } from '@/settings/types'
import { MessageScreen, PublishableMessageSource, createMessageSource } from '@/screen/MessageScreen'
import { App as CommentApp } from '@/comment/App'
import { AcnMessage, CloseCode, CommentMessage, isAcnOkMessage, Message } from '@/common/Message'
import { assertNotNullable } from '@/common/assert'

declare global {
  interface Window {
    main: {
      request: () => Promise<SettingsV1>
      onMessage: (onMessage: (m: Message) => void) => () => void
    }
    poll: {
      request: () => Promise<SettingsV1>
    }
    settings: {
      requestSettings: () => Promise<SettingsV1>
      postSettings: (settings: SettingsV1) => Promise<void>
      getScreenPropsList: () => Promise<ScreenProps[]>
    }
    comment: {
      request: () => Promise<SettingsV1>
      send: (m: Message | null) => Promise<void>
      postCredential: (m: AcnMessage) => Promise<void>
      onLoggedIn: (onLoggedIn: (_: AcnMessage) => void) => () => void
    }
  }
}

const log = getLogger('renderer')

export function screenMain(): void {
  window.main.request().then((settings: SettingsV1): void => {
    const App: FC = (): JSX.Element => {
      const messageSource = useMemo((): PublishableMessageSource => createMessageSource(), [])

      useEffect((): (() => void) => {
        return window.main.onMessage(messageSource.publish)
      }, [messageSource])

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
    assertNotNullable(rootElement, 'Root element not found')
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
    assertNotNullable(rootElement, 'Root element not found')
    const root = createRoot(rootElement)
    root.render(<App />)
  })
}

export function settingsMain(): void {
  const rootElement = document.getElementById('root')
  assertNotNullable(rootElement, 'Root element not found')
  const root = createRoot(rootElement)
  root.render(
    <StrictMode>
      <SettingsForm useStandaloneSettings={true} repository={window.settings} />
    </StrictMode>
  )
}

function login(apiUrl: string, settings: SettingsV1): Promise<Message | null> {
  const message: AcnMessage = {
    type: 'acn',
    room: settings.general.room,
    longLife: false,
    hash: createHash(settings.general.password)
  }
  return fetchWithTimeout(
    `${apiUrl}/login`,
    {
      method: 'POST',
      cache: 'no-store',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    },
    3000
  ).then((res: Response): Promise<Message> =>
    res.ok
      ? res.json()
      : Promise.resolve({ type: 'error', error: 'ERROR', message: 'Fetch failed' })
  ).then((m: Message): Message | null=> {
    if (!isAcnOkMessage(m)) {
      return m
    }
    window.localStorage.setItem('token', m.attrs.token)
    return null
  })
}

const onClose = (ev: CloseEvent): void => {
  if (ev.code === CloseCode.ACN_FAILED) {
    const comment: CommentMessage = {
      type: 'comment',
      comment: 'Room authentication failed. Please check your setting 👀'
    }
    window.comment.send(comment)
    return
  }

  const comment: CommentMessage = {
    type: 'comment',
    comment: `Failed to connect to the server (${ev.code}) 😢`
  }
  window.comment.send(comment)
}

function createServerUrls(hostOrUrl?: string): { ws?: string, api?: string, origin?: string } {
  if (!hostOrUrl) {
    return {}
  }

  // For local development
  if (/^ws:\/\/localhost:8080\/?/.test(hostOrUrl) || /'http:\/\/localhost:9080'\/?/.test(hostOrUrl)) {
    return {
      ws: 'ws://localhost:8080',
      api: 'http://localhost:9080',
      origin: 'http://localhost:8888',
    }
  }

  // TODO Check strictly
  const wsUrlRe = /^(wss?):\/\/([^/]+)\/app$/
  const wsExec = wsUrlRe.exec(hostOrUrl)
  if (wsExec) {
    const protocol = wsExec[1] === 'wss' ? 'https' : 'http'
    const domain = wsExec[2]
    return {
      ws: hostOrUrl,
      api: `${protocol}://${domain}/api`,
      origin: `${protocol}://${domain}`,
    }
  }
  // TODO Check strictly
  const apiUrlRe = /^(https?):\/\/([^/]+)\/api$/
  const apiExec = apiUrlRe.exec(hostOrUrl)
  if (apiExec) {
    const protocol = apiExec[1] === 'https' ? 'wss' : 'ws'
    const domain = apiExec[2]
    return {
      ws: `${protocol}://${domain}/app`,
      api: hostOrUrl,
      origin: `${protocol}://${domain}`,
    }
  }

  if (/^wss?:\/\//.test(hostOrUrl) || /^https?:\/\//.test(hostOrUrl)) {
    throw new Error('Unexpected: ' + hostOrUrl)
  }

  return {
    ws: `wss://${hostOrUrl}/app`,
    api: `https://${hostOrUrl}/api`,
    origin: `https://${hostOrUrl}`,
  }
}

export function commentMain(): Promise<void> {
  if (!window.comment && window.top) {
    // in iframe
    window.comment = window.top.comment
  }

  return window.comment.request().then((settings: SettingsV1): Promise<void> => {
    const urls = createServerUrls(settings.general.url)
    const onOpen = (): void => {
      const comment: CommentMessage = {
        type: 'comment',
        comment: `🎉 Connected to ${urls.ws} 🎉`,
      }
      window.comment.send(comment)
    }

    const promise = urls.api && settings.general.room && settings.general.password
      ? login(urls.api, settings).then(window.comment.send)
      : urls.api ? Promise.resolve() : Promise.reject('No URL defined.')

    const rootElement = document.getElementById('root')
    assertNotNullable(rootElement, 'Root element not found')
    const root = createRoot(rootElement)

    return promise.then((): void => {
      // TODO Display error when fetch returns an error.
      root.render(
        <StrictMode>
          <CommentApp
            wsUrl={urls.ws} apiUrl={urls.api}
            onOpen={onOpen} onClose={onClose} onMessage={window.comment.send} onError={log.error}
          />
        </StrictMode>
      )
    }).catch((e: unknown) => {
      root.render(
        <StrictMode>
          <div>Check your settings, or contact your administrator for server status.</div>
          <pre>{JSON.stringify(e)}</pre>
        </StrictMode>
      )
    })
  })
}
