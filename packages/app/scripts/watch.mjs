/* eslint-disable no-console */
import { build } from 'esbuild'
import { copyFiles } from 'esbuild-plugin-copy-files'

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
  entryPoints: ['./src/server/api.ts'],
  outfile: 'dist/bundle/server/api.js',
  color: true,
  bundle: true,
  platform: 'node',
  target: ['es2020'],
  watch: dev && printRebuildResult('api'),
  minify: !dev,
}).then(() => log('api', 'Watching...'))

const streaming = build({
  entryPoints: ['./src/server/streaming.ts'],
  outfile: 'dist/bundle/server/streaming.js',
  color: true,
  bundle: true,
  platform: 'node',
  target: ['es2020'],
  watch: dev && printRebuildResult('streaming'),
  minify: !dev,
}).then(() => log('streaming', 'Watching...'))

const comment = build({
  entryPoints: ['src/comment/index.tsx'],
  outfile: 'dist/bundle/comment/index.js',
  inject: ['scripts/react-shim.js'],
  color: true,
  bundle: true,
  platform: 'browser',
  target: ['es2020'],
  watch: dev && printRebuildResult('comment'),
  minify: !dev,
  plugins: [
    copyFiles({ entries: [
      { src: 'src/public/*', destDir: 'dist/bundle/comment/' },
    ]})
  ],
}).then(() => log('comment', 'Watching...'))

const desktop = build({
  entryPoints: ['src/desktop/index.ts', 'src/desktop/preload.ts'],
  outdir: 'dist/desktop/',
  color: true,
  bundle: true,
  platform: 'node',
  external: ['electron'],
  watch: dev && printRebuildResult('desktop:main'),
  minify: !dev
}).then(() => log('desktop:main', 'Watching...'))

const renderer = build({
  entryPoints: ['src/desktop/renderer.tsx'],
  outfile: 'resources/renderer.js',
  inject: ['scripts/react-shim.js'],
  format: 'esm',
  color: true,
  bundle: true,
  platform: 'browser',
  target: ['es2020'],
  watch: dev && printRebuildResult('desktop:renderer'),
  minify: !dev,
  plugins: [
    copyFiles({ entries: [
      { src: 'src/screen/screen.css', destDir: 'resources/' },
    ]})
  ],
}).then(() => log('desktop:renderer', 'Watching...'))

const extension = build({
  entryPoints: [
    'src/extension/background.ts',
    'src/extension/contentScript.tsx',
    'src/extension/popup/popup.tsx',
    'src/extension/popup/comment.tsx'
  ],
  inject: ['scripts/react-shim.js'],
  color: true,
  bundle: true,
  platform: 'browser',
  target: ['es2020', 'es2020'],
  outdir: 'dist/bundle/extension/',
  watch: dev && printRebuildResult('extension'),
  minify: !dev,
  plugins: [
    copyFiles({
      entries: [
        { src: 'src/extension/manifest.json', destDir: 'dist/bundle/extension/' },
        { src: 'src/extension/options/options.html', destDir: 'dist/bundle/extension/options/' },
        { src: 'src/extension/popup/*.html', destDir: 'dist/bundle/extension/popup/' },
        { src: 'src/screen/screen.css', destDir: 'dist/bundle/extension/popup/' },
        { src: 'resources/icon.png', destDir: 'dist/bundle/extension/images/'},
        { src: 'resources/icon@[236].png', destDir: 'dist/bundle/extension/images/'},
      ],
    })
  ]
}).then(() => log('extension', 'Watching...'))

Promise.all([api, streaming, comment, desktop, renderer, extension])