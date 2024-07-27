/* eslint-disable no-console */
import concurrently from 'concurrently'
import fs from 'node:fs'
import path from 'node:path'

function pad(name) {
  return name.padEnd(16)
}

const streamingMain = 'dist/bundle/server/streaming.js'
if (!fs.existsSync(streamingMain)) {
  fs.mkdirSync(path.dirname(streamingMain), { recursive: true, mode: 0o755 })
  fs.writeFileSync(streamingMain, `console.log('I am ${streamingMain}')`)
  console.info(`Create dummy ${streamingMain}.`)
}
const apiMain = 'dist/bundle/server/api.js'
if (!fs.existsSync(apiMain)) {
  fs.mkdirSync(path.dirname(apiMain), { recursive: true, mode: 0o755 })
  fs.writeFileSync(apiMain, `console.log('I am ${apiMain}')`)
  console.info('Create dummy api.js.')
}

const serverConfigPath = process.argv[2] || 'config/server.config.json'

const commands = [{
  name: pad('comment:serve'),
  prefixColor: 'yellow',
  command: `${process.execPath} scripts/serve_comment.mjs`,
}, {
  name: pad('stream:serve'),
  prefixColor: 'magenta',
  command: `${process.execPath} --watch ${streamingMain} -l DEBUG -p 8080 -c ${serverConfigPath}`,
},
{
  name: pad('api:serve'),
  prefixColor: 'green',
  command: `${process.execPath} --watch ${apiMain} -l DEBUG -p 9080 -c ${serverConfigPath}`
}]

console.info(`Serving: ${commands.map(c => '\n ' + c.name.trim()).join('')}`)
concurrently(commands, {
  prefix: '[{time} {name}({pid})]'
})
