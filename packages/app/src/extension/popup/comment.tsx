import { createRoot } from 'react-dom/client'
import { App } from '@/comment/App'
import { getLogger } from '@/common/Logger'
import { createCommentAppProps } from './createCommentAppProps'

const log = getLogger('comment')
log.info('comment.tsx on', window.location.href)

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}
const root = createRoot(rootElement)
const props = window.location.href.endsWith('/sound')
  ? {}
  : createCommentAppProps()

root.render(<App {...props} />)
