/* eslint-disable no-console */
import { build, context } from 'esbuild'
import { copyFiles } from 'esbuild-plugin-copy-files'
import { apps } from './apps.mjs'

const dev = process.env['NODE_ENV'] !== 'production'

const log = (name, message) => {
  console.info(`${new Date().toLocaleString()} [${name}] ${message}`)
}

const printRebuildResult = (name) => ({
  name: `print-rebuild-result-${name}`,
  setup: (build) => {
    build.onEnd((result) => {
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
      const delimiter = messages.length === 1 ? ' ' : '\n'
      console.info(`${new Date().toLocaleString()} [${name}]:${delimiter}${messages.join('\n')}`)
    })
  }
})

const optionsList = {
  api: {
    entryPoints: apps.api.entryPoints,
    outfile: apps.api.outfile,
    color: true,
    bundle: true,
    platform: 'node',
    target: ['es2020'],
    minify: !dev,
    plugins: dev ? [printRebuildResult('api')] : [],
  },
  streaming: {
    entryPoints: apps.streaming.entryPoints,
    outfile: apps.streaming.outfile,
    color: true,
    bundle: true,
    platform: 'node',
    target: ['es2020'],
    minify: !dev,
    plugins: dev ? [printRebuildResult('streaming')] : [],
  },
  comment: {
    entryPoints: apps.comment.entryPoints,
    outfile: apps.comment.outfile,
    inject: ['scripts/react-shim.js'],
    color: true,
    bundle: true,
    platform: 'browser',
    target: ['es2020'],
    minify: !dev,
    plugins: [
      copyFiles({ entries: apps.comment.assets, watch: dev }),
      ...(dev ? [printRebuildResult('comment')] : []),
    ],
  },
  desktop: {
    entryPoints: apps.desktop.entryPoints,
    outdir: apps.desktop.outdir,
    color: true,
    bundle: true,
    platform: 'node',
    external: ['electron'],
    minify: !dev,
    plugins: dev ? [printRebuildResult('desktop:main')] : [],
  },
  renderer: {
    entryPoints: apps.renderer.entryPoints,
    outfile: apps.renderer.outfile,
    inject: ['scripts/react-shim.js'],
    format: 'esm',
    color: true,
    bundle: true,
    platform: 'browser',
    target: ['es2020'],
    minify: !dev,
    plugins: dev ? [printRebuildResult('desktop:renderer')] : [],
  },
  extension: {
    entryPoints: apps.extension.entryPoints,
    outdir: apps.extension.outdir,
    inject: ['scripts/react-shim.js'],
    color: true,
    bundle: true,
    platform: 'browser',
    target: ['es2020', 'es2020'],
    minify: !dev,
    plugins: [
      copyFiles({ entries: apps.extension.assets, watch: dev }),
      ...(dev ? [printRebuildResult('extension')] : []),
    ],
  }
}

console.info('Targets:', Object.keys(optionsList).join(', '))
await Promise.all(
  Object
    .entries(optionsList)
    .map(async (entry) => {
      const [name, options] = entry
      if (dev) {
        const ctx = await context(options)
        await ctx.watch()
        log(name, 'Watching...')
      } else {
        await build(options)
        log(name, 'Built.')
      }
    })
)
