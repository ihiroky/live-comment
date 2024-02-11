import { plugins, onwarn, watch } from './c.mjs'
import { mkdirSync } from 'fs'
import { apps, toRollupCopyPluginFormat, entryPointsToOutFiles } from '../scripts/apps.mjs'
import path from 'node:path'

mkdirSync('dist/bundle/extension/images', { recursive: true, mode: 0o755 })
const entryPoints = apps.extension.entryPoints
const names = entryPoints.map(ep => path.basename(ep)).map(bn => bn.substring(0, bn.lastIndexOf('.')))
const outFiles = entryPointsToOutFiles(apps.extension.entryPoints, apps.extension.outdir)
const _plugins = new Array(4)
_plugins[0] = plugins(toRollupCopyPluginFormat(apps.extension.assets))
for (let i = 1; i < entryPoints.length; i++) {
  _plugins[i] = plugins()
}

export default entryPoints.map((e, i) => ({
  input: e,
  output: {
    file: outFiles[i],
    name: names[i],
    format: 'iife',
  },
  plugins: _plugins[i],
  onwarn,
  watch,
}))
