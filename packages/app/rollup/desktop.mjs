import { plugins, plugins_for_last_process, onwarn, watch, } from './c.mjs'
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
  external: ['electron'],
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
  external: ['electron'],
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
  external: ['electron'],
  plugins: plugins_for_last_process(), // Hung up workaround for github actions on Windows
  onwarn,
  watch,
}]
