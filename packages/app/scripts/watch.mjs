import concurrently from 'concurrently'
import fs from 'node:fs'
import path from 'node:path'

function pad(name) {
  return name.padEnd(16)
}

function cmd(cmd) {
  return path.join('node_modules', '.bin', cmd)
}

function parseOpts() {
  const opts = process.argv[2]
  if (!opts) {
    return {
      comment: true,
      desktop: true,
      extension: true,
      server: true
    }
  } else if (opts === '-h' || opts === '--help') {
    // eslint-disable-next-line no-console
    console.info(`Usage: ${process.argv[1]} [cdes]\n
    c: Watch comment module.\n
    d: Watch desktop module.\n
    e: Watch extension module.\n
    s: Watch server module.`)
  } else {
    return {
      comment: opts.includes('c'),
      desktop: opts.includes('d'),
      extension: opts.includes('e'),
      server: opts.includes('s'),
    }
  }
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

const opts = parseOpts()

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
    name: pad('desktop:main'),
    prefixColor: 'cyan',
    command: `${cmd('tsc')} -p tsconfig-desktop.json -w`
  },
  {
    name: pad('desktop:renderer'),
    prefixColor: 'cyanBright',
    command: `${cmd('rollup')} -c rollup/desktop.js -w`,
  },
  {
    name: pad('desktop:preload'),
    prefixColor: 'cyanBright',
    command: `${cmd('rollup')} -c rollup/desktop-preload.js -w`,
  }
]
const extension = [
  {
    name: pad('extension:build'),
    prefixColor: 'magenta',
    command: `${cmd('rollup')} -c rollup/extension.js -w`,
  }
]
const servers = [
  {
    name: pad('servers:build'),
    prefixColor: 'green',
    command: `${cmd('rollup')} -c rollup/server.js -w`,
  },
  // Use nodemon because rollup-run can't run multiple processes defined in single config.js at once.
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

const commands = []
if (opts.comment) {
  commands.push(...comment)
}
if (opts.desktop) {
  commands.push(...desktop)
}
if (opts.extension) {
  commands.push(...extension)
}
if (opts.server) {
  commands.push(...servers)
}
// eslint-disable-next-line no-console
console.info(`Watching: ${commands.map(c => '\n ' + c.name.trim()).join('')}`)
concurrently(commands, {
  prefix: '[{time} {name}({pid})]'
})
