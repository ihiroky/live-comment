import { plugins, onwarn, watch, } from './c.js'
import { apps, entryPointsToOutFiles } from '../scripts/apps.mjs'

const entryPoints = apps.desktop.entryPoints
const outFiles = entryPointsToOutFiles(apps.desktop.entryPoints, apps.desktop.outdir)

export default [{
  input: entryPoints[0],
  output: {
    file: outFiles[0],
    name: 'Main',
    format: 'cjs',
  },
  plugins: plugins(),
  onwarn,
  watch,
}, {
  input: entryPoints[1],
  output: {
    file: outFiles[1],
    name: 'Preload',
    format: 'cjs',
  },
  plugins: plugins(),
  onwarn,
  watch,
}, {
  input: apps.renderer.entryPoints,
  output: {
    file: apps.renderer.outfile,
    name: 'Renderer',
    format: 'es'
  },
  plugins: plugins(),
  onwarn,
  watch,
}]
