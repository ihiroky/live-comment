/* eslint-disable no-console */

import http from 'node:http'
import fs from 'node:fs'

function resolveContent(url) {
  if (url.endsWith('/index.js')) {
    return [fs.readFileSync('index.js'), 'text/javascript; charset=utf8']
  } else if (url.endsWith('/logo.png')) {
    return[fs.readFileSync('../../../resources/logo.png'), 'image/png']
  }
  return [fs.readFileSync('index.html'), 'text/html; charset=utf8']
}

const server = http.createServer(function(request, response) {
  try {
    const [text, mimeType] = resolveContent(request.url)
    response.writeHead(200, {
      'Content-Type': mimeType,
      'Feature-Policy': "autoplay 'self'"
    })
    response.end(text)
  } catch (e) {
    response.writeHead(404)
    response.end(`${request.url} is not found: ${String(e)}}`)
  }
})

fs.mkdirSync('dist/bundle/comment/', { recursive: true, mode: 0o755 })
const wd = './dist/bundle/comment/'
process.chdir(wd)
server.listen(8888)
setTimeout(() => {
  console.info(`Start server on http://localhost:8888/ at ${wd}`)
}, 1000)
