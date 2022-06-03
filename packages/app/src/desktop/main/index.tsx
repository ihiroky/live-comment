import { FC, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Screen } from '@/screen/Screen'
import { SettingsV1 } from '../settings'
import { createHash } from '@/common/utils'

declare global {
  interface Window {
    main: {
      request(): Promise<SettingsV1>
    }
  }
}

window.main.request().then((settings: SettingsV1): void => {
  const App: FC = (): JSX.Element => {
    return (
      <StrictMode>
        <Screen
          url={settings.general.url}
          room={settings.general.room}
          hash={createHash(settings.general.password)}
          duration={settings.general.duration * 1000}
          color={settings.general.fontColor}
          fontBorderColor={settings.general.fontBorderColor}
          watermark={settings.watermark}
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
