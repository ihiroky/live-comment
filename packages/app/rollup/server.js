import { plugins, onwarn, watch } from './c.js'
import { apps } from '../scripts/apps.mjs'

export default [
  {
    input: apps.api.entryPoints,
    output: {
      file: apps.api.outfile,
      name: 'Api',
      format: 'cjs'
    },
    plugins: plugins(),
    onwarn,
    watch,
  }, {
    input: apps.streaming.entryPoints,
    output: {
      file: apps.streaming.outfile,
      name: 'Streaming',
      format: 'cjs'
    },
    plugins: plugins(),
    onwarn,
    watch,
  }
]
