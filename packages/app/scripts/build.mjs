/* eslint-disable no-console */
import concurrently from 'concurrently'
import { cmddef } from './cmddef.mjs'

const argv = process.argv.slice(2)
if (argv.length === 0) {
  console.info(`Usage: ${process.argv[1]} [all|c|dm|dr|e|s]
  all: batch all modules.
  c  : build comment module.
  dm : build desktop main module.
  dr : build desktop renderer module.
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
