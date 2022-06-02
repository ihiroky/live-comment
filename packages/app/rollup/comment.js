import { copy, plugins, onwarn } from './c.js'
import { mkdirSync } from 'fs'

mkdirSync('dist/bundle/comment/', { recursive: true, mode: 0o755 })
copy('public/index.html', 'dist/bundle/comment/index.html')
copy('public/robots.txt', 'dist/bundle/comment/robots.txt')

export default [{
  input: 'src/comment/index.tsx',
  output: {
    file: 'dist/bundle/comment/main.js',
    name: 'Comment',
    format: 'iife'
  },
  watch: {
    buildDelay: 3333,
  },
  plugins: plugins(),
  onwarn,
}]
