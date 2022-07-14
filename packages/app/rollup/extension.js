import { plugins, onwarn, watch } from './c.js'
import { mkdirSync } from 'fs'
import { apps, toRollupCopyPluginFormat, entryPointsToOutFiles } from '../scripts/apps.mjs'

mkdirSync('dist/bundle/extension/images', { recursive: true, mode: 0o755 })
const entryPoints = apps.extension.entryPoints
const outFiles = entryPointsToOutFiles(apps.extension.entryPoints, apps.extension.outdir)

export default [{
  input: entryPoints[0],
  output: {
    file: outFiles[0],
    name: 'Comment',
    format: 'iife',
  },
  plugins: plugins(toRollupCopyPluginFormat(apps.extension.assets)),
  onwarn,
  watch,
}, {
  input: entryPoints[1],
  output: {
    file: outFiles[1],
    name: 'Comment',
    format: 'iife',
  },
  plugins: plugins(),
  onwarn,
  watch,
}, {
  input: entryPoints[2],
  output: {
    file: outFiles[2],
    name: 'Popup',
    format: 'iife',
  },
  plugins: plugins(),
  onwarn,
  watch,
}, {
  input: entryPoints[3],
  output: {
    file: outFiles[3],
    name: 'Comment',
    format: 'iife',
  },
  plugins: plugins(),
  onwarn,
  watch,
}]
