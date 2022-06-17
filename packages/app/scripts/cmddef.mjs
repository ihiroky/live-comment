import path from 'node:path'

function pad(name) {
  return name.padEnd(16)
}

function cmd(cmd) {
  return path.join('node_modules', '.bin', cmd)
}

export const cmddef = {
  c: {
    name: pad('comment:build'),
    prefixColor: 'cyan',
    command: `${cmd('rollup')} -c rollup/comment.js`,
  },
  dm: {
    name: pad('desktop:main'),
    prefixColor: 'magenta',
    command: `${cmd('tsc')} -p tsconfig-desktop.json`
  },
  dr: {
    name: pad('desktop:renderer'),
    prefixColor: 'yellow',
    command: `${cmd('rollup')} -c rollup/desktop.js`,
  },
  e: {
    name: pad('extension:build'),
    prefixColor: 'green',
    command: `${cmd('rollup')} -c rollup/extension.js`,
  },
  s: {
    name: pad('servers:build'),
    prefixColor: 'blue',
    command: `${cmd('rollup')} -c rollup/server.js`,
  },
}
