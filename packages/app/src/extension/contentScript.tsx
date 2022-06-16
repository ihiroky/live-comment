import { createRoot } from 'react-dom/client'
import { getLogger } from '@/common/Logger'

const rootElement = document.getElementById('_lc_root') || document.createElement('div')
if (!rootElement.id) {
  rootElement.id = '_lc_root'
  document.body.appendChild(rootElement)
}
const root = createRoot(rootElement)
root.render(<div></div>)
getLogger('contentScript').info('Content script loaded.')
