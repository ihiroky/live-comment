/* eslint-disable no-console */
import { build } from 'esbuild'
import { copyFiles } from 'esbuild-plugin-copy-files'
import { apps } from './apps.mjs'

const dev = process.env['NODE_ENV'] !== 'production'

const log = (name, message) => {
  console.info(`${new Date().toLocaleString()} [${name}] ${message}`)
}

const printRebuildResult = (name) => ({
  onRebuild: (err, result) => {
    const messages = []
    if (result.errors.length === 0 && result.warnings.length === 0) {
      messages.push('Rebuild completed. No errors/warnings.')
    }
    if (result.errors.length > 0) {
      messages.push(`Found ${result.errors.length} error(s).\n`)
      messages.push(...result.errors)
    }
    if (result.warnings.length > 0) {
      messages.push(`Found ${result.warnings.length} warning(s).\n`)
      messages.push(...result.warnings)
    }
    if (err) {
      console.error(err)
    }
    const delimiter = messages.length === 1 ? ' ' : '\n'
    console.info(`${new Date().toLocaleString()} [${name}]:${delimiter}${messages.join('\n')}`)
  }
})

const api = build({
  entryPoints: apps.api.entryPoints,
  outfile: apps.api.outfile,
  color: true,
  bundle: true,
  platform: 'node',
  target: ['es2020'],
  watch: dev && printRebuildResult('api'),
  minify: !dev,
}).then(() => log('api', 'Watching...'))

const streaming = build({
  entryPoints: apps.streaming.entryPoints,
  outfile: apps.streaming.outfile,
  color: true,
  bundle: true,
  platform: 'node',
  target: ['es2020'],
  watch: dev && printRebuildResult('streaming'),
  minify: !dev,
}).then(() => log('streaming', 'Watching...'))

const comment = build({
  entryPoints: apps.comment.entryPoints,
  outfile: apps.comment.outfile,
  inject: ['scripts/react-shim.js'],
  color: true,
  bundle: true,
  platform: 'browser',
  target: ['es2020'],
  watch: dev && printRebuildResult('comment'),
  minify: !dev,
  plugins: [
    copyFiles({ entries: apps.comment.assets })
  ],
}).then(() => log('comment', 'Watching...'))

const desktop = build({
  entryPoints: apps.desktop.entryPoints,
  outdir: apps.desktop.outdir,
  color: true,
  bundle: true,
  platform: 'node',
  external: ['electron'],
  watch: dev && printRebuildResult('desktop:main'),
  minify: !dev
}).then(() => log('desktop:main', 'Watching...'))

const renderer = build({
  entryPoints: apps.renderer.entryPoints,
  outfile: apps.renderer.outfile,
  inject: ['scripts/react-shim.js'],
  format: 'esm',
  color: true,
  bundle: true,
  platform: 'browser',
  target: ['es2020'],
  watch: dev && printRebuildResult('desktop:renderer'),
  minify: !dev,
}).then(() => log('desktop:renderer', 'Watching...'))

const extension = build({
  entryPoints: apps.extension.entryPoints,
  outdir: apps.extension.outdir,
  inject: ['scripts/react-shim.js'],
  color: true,
  bundle: true,
  platform: 'browser',
  target: ['es2020', 'es2020'],
  watch: dev && printRebuildResult('extension'),
  minify: !dev,
  plugins: [
    copyFiles({ entries: apps.extension.assets })
  ]
}).then(() => log('extension', 'Watching...'))

Promise.all([api, streaming, comment, desktop, renderer, extension])