import { createRoot } from 'react-dom/client'
import { getLogger } from '@/common/Logger'
import { SettingsForm } from '@/settings/SettingsForm'
import { SettingsV1 } from '@/settings/settings'
import { store } from '../store'
import { useMemo, useSyncExternalStore } from 'react'

const log = getLogger('settings')
log.info('Settings.tsx on', window.location.href)

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

const root = createRoot(rootElement)
const App = (): JSX.Element => {
  const storeCache = useSyncExternalStore(store.subscribe, () => store.cache)
  const props = useMemo(() => ({
    useStandaloneSettings: false,
    repository: {
      requestSettings: () => Promise.resolve(store.cache.settingsTab.settings),
      postSettings: (settings: SettingsV1): Promise<void> => {
        return store.update('settingsTab', {
          ...storeCache.settingsTab,
          settings,
        })
      },
      getScreenPropsList: () => Promise.resolve([]),
    },
  }), [storeCache])

  return <SettingsForm {...props} />
}

root.render(<App />)
