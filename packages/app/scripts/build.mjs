/* eslint-disable no-console */
import concurrently from 'concurrently'
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
  d: {
    name: pad('desktop:build'),
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


const argv = process.argv.slice(2)
if (argv.length === 0) {
  console.info(`Usage: ${process.argv[1]} [all|c|dm|dr|e|s]
  all: batch all modules.
  c  : build comment module.
  d  : build desktop module.
  e  : build extension module.
  s  : build server module.`)
  process.exit(1)
}

const commands = argv.includes('all') ? Object.values(cmddef) : argv.map(a => cmddef[a])
if (commands.length === 0) {
  console.info(`No modules to build.`)
  process.exit(2)
}
console.info(`Building: ${commands.map(c => '\n ' + c.name.trim()).join('')}`)
concurrently(commands, {
  prefix: '[{time} {pid} {name}]'
})
