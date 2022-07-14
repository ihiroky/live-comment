import { plugins, onwarn, watch } from './c.js'
import { mkdirSync } from 'fs'
import { apps, toRollupCopyPluginFormat } from '../scripts/apps.mjs'

mkdirSync('dist/bundle/comment/', { recursive: true, mode: 0o755 })

export default [{
  input: apps.comment.entryPoints,
  output: {
    file: apps.comment.outfile,
    name: 'Comment',
    format: 'iife'
  },
  plugins: plugins(toRollupCopyPluginFormat(apps.comment.assets)),
  onwarn,
  watch,
}]
