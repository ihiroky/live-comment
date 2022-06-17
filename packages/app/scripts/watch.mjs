/* eslint-disable no-console */
import concurrently from 'concurrently'
import { cmddef } from './cmddef.mjs'

const argv = process.argv.slice(2)
if (argv.length === 0) {
  console.info(`Usage: ${process.argv[1]} [all|c|dm|dr|e|s]
  all: watch all modules (maybe unstable).
  c  : watch comment module.
  dm : watch desktop main module.
  dr : watch desktop renderer module.
  e  : watch extension module.
  s  : watch server module.`)
  process.exit(1)
}

const targets = argv.includes('all') ? Object.values(cmddef) : argv.map(a => cmddef[a]).filter(a => !!a)
const commands = targets.map(cd => ({ ...cd, command: `${cd.command} --watch` }))
if (commands.length === 0) {
  console.info(`No modules to watch.`)
  process.exit(2)
}
console.info(`Watching: ${commands.map(c => '\n ' + c.name.trim()).join('')}`)
concurrently(commands, {
  prefix: '[{time} {pid} {name}]'
})
