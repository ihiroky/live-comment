import fs from 'fs'
import https from 'https'
import WebSocket from 'ws'
import 'tslib'

const server = https.createServer({
  cert: fs.readFileSync('dist/cert.pem'),
  key: fs.readFileSync('dist/key.pem')
}).on('request', (_, res): void => {
  res.end('Hello.')
})
const wss = new WebSocket.Server({ server })
wss.on('connection', function(ws) {
  ws.on('message', function(message) {
    console.log('message', message)
    // TODO add queue not to blocked by slow clients
    wss.clients.forEach(client => client.send(message))
  })
  ws.send('connected.')
})

// TODO handle upgrade to authenticate client
// TODO detect stale connections
// TODO proxy

server.listen(8080)