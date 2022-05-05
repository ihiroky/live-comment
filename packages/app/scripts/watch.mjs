import concurrently from 'concurrently'
import fs from 'node:fs'
import path from 'node:path'

function pad(name) {
  return name.padEnd(14)
}

function cmd(cmd) {
  return path.join('node_modules', '.bin', cmd)
}

// Clean dist and build directories and prepare for watch mode not to fail.
['dist', 'build'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, {recursive: true})
  }
})
fs.mkdirSync('dist/server/', { recursive: true })
fs.mkdirSync('dist/bundle/server/streaming', { recursive: true })
fs.mkdirSync('dist/bundle/server/api', { recursive: true })
fs.writeFileSync('dist/server/streaming.js', "console.log('dummy.');")
fs.writeFileSync('dist/server/api.js', "console.log('dummy.');")
fs.writeFileSync('dist/bundle/server/streaming/index.js', "console.log('dummy.');")
fs.writeFileSync('dist/bundle/server/api/index.js', "console.log('dummy.');")

const comment = [
  {
    name: pad('comment:build'),
    prefixColor: 'cyan',
    command: `${cmd('rollup')} -c rollup.comment.js -w`,
  },
  {
    name: pad('comment:serve'),
    prefixColor: 'green',
    command: `${process.execPath} scripts/serve.mjs`,
  },
]
const desktop = [
  {
    name: pad('desktop:tsc'),
    prefixColor: 'yellow',
    command: `${cmd('tsc')} -p tsconfig-desktop.json -w`
  },
  {
    name: pad('desktop:bundle'),
    prefixColor: 'cyan',
    command: `${cmd('rollup')} -c rollup.desktop.js -w`,
  },
]
const streaming = [
  {
    name: pad('stream:tsc'),
    prefixColor: 'yellow',
    command: `${cmd('tsc')} -w -p tsconfig-server.json`,
  },
  {
    name: pad('stream:bundle'),
    prefixColor: 'cyan',
    command: `${cmd('ncc')} build -w -o dist/bundle/server/streaming dist/server/streaming.js`,
  },
  {
    name: pad('stream:serve'),
    prefixColor: 'green',
    command: `${cmd('nodemon')} -w dist/bundle/server/streaming dist/bundle/server/streaming/index.js -- -l DEBUG -p 8080`,
  },
]
const api = [
  {
    name: pad('api:tsc'),
    prefixColor: 'yellow',
    command: `${cmd('tsc')} -w -p tsconfig-server.json`,
  },
  {
    name: pad('api:bundle'),
    prefixColor: 'cyan',
    command: `${cmd('ncc')} build -w -o dist/bundle/server/api dist/server/api.js`,
  },
  {
    name: pad('api:serve'),
    prefixColor: 'green',
    command: `${cmd('nodemon')} -w dist/bundle/server/api dist/bundle/server/api/index.js -- -l DEBUG -p 9080`,

  },
]

concurrently([
  ...comment,
  ...desktop,
  ...streaming,
  ...api,
], {
  prefix: '[{time} {name}({pid})]'
})
