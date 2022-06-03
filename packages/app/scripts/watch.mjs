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
fs.mkdirSync('dist/bundle/server/', { recursive: true })
fs.writeFileSync('dist/bundle/server/streaming.js', "console.log('dummy.');")
fs.writeFileSync('dist/bundle/server/api.js', "console.log('dummy.');")

const comment = [
  {
    name: pad('comment:build'),
    prefixColor: 'yellow',
    command: `${cmd('rollup')} -c rollup/comment.js -w`,
  },
  {
    name: pad('comment:serve'),
    prefixColor: 'yellowBright',
    command: `${process.execPath} scripts/serve.mjs`,
  },
]
const desktop = [
  {
    name: pad('desktop:main:tsc'),
    prefixColor: 'cyan',
    command: `${cmd('tsc')} -p tsconfig-desktop.json -w`
  },
  {
    name: pad('desktop:bundle'),
    prefixColor: 'cyanBright',
    command: `${cmd('rollup')} -c rollup/desktop.js -w`,
  },
]
const servers = [
  {
    name: pad('comment:build'),
    prefixColor: 'green',
    command: `${cmd('rollup')} -c rollup/server.js -w`,
  },
  // rollup-run can't run multiple processes defined in single config.js at once.
  {
    name: pad('stream:serve'),
    prefixColor: 'greenBright',
    command: `${cmd('nodemon')} -w dist/bundle/server/streaming.js dist/bundle/server/streaming.js -- -l DEBUG -p 8080`,
  },
  {
    name: pad('api:serve'),
    prefixColor: 'green',
    command: `${cmd('nodemon')} -w dist/bundle/server/api.js dist/bundle/server/api.js -- -l DEBUG -p 9080`,
  },
]

concurrently([
  ...comment,
  ...desktop,
  ...servers,
], {
  prefix: '[{time} {name}({pid})]'
})
