import { plugins, onwarn, watch } from './c.js'
import { mkdirSync } from 'fs'

mkdirSync('dist/bundle/extension/images', { recursive: true, mode: 0o755 })

export default [{
  input: 'src/extension/contentScript.tsx',
  output: {
    file: 'dist/bundle/extension/contentScript.js',
    name: 'Comment',
    format: 'iife'
  },
  plugins: plugins(),
  onwarn,
  watch,
}, {
  input: 'src/extension/background.ts',
  output: {
    file: 'dist/bundle/extension/background.js',
    name: 'Comment',
    format: 'iife'
  },
  plugins: plugins([
    { src: 'src/extension/manifest.json', dest: 'dist/bundle/extension/' },
    { src: 'src/extension/*.html', dest: 'dist/bundle/extension/' },
    { src: 'resources/icon.png', dest: 'dist/bundle/extension/images/'},
    { src: 'resources/icon@[236].png', dest: 'dist/bundle/extension/images/'},
  ]),
  onwarn,
  watch,
}]
