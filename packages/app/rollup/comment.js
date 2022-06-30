import { plugins, onwarn, watch } from './c.js'
import { mkdirSync } from 'fs'

mkdirSync('dist/bundle/comment/', { recursive: true, mode: 0o755 })

export default [{
  input: 'src/comment/index.tsx',
  output: {
    file: 'dist/bundle/comment/index.js',
    name: 'Comment',
    format: 'iife'
  },
  plugins: plugins([
    { src: 'src/public/index.html', dest: 'dist/bundle/comment/' },
    { src: 'src/public/robots.txt', dest: 'dist/bundle/comment/' },
  ]),
  onwarn,
  watch,
}]
