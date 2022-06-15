import { plugins, onwarn } from './c.js'
import copy from 'rollup-plugin-copy'

export default [{
  input: 'src/desktop/main/index.tsx',
  output: {
    file: 'resources/main/index.js',
    name: 'Screen',
    format: 'iife'
  },
  plugins: plugins([
    { src: 'src/screen/screen.css', dest: 'resources/main/index.css' },
  ]),
  onwarn,
}, {
  input: 'src/desktop/settings/index.tsx',
  output: {
    file: 'resources/settings.js',
    name: 'Settings',
    format: 'iife'
  },
  plugins: plugins(),
  onwarn,
}, {
  input: 'src/desktop/poll/index.tsx',
  output: {
    file: 'resources/poll.js',
    name: 'Poll',
    format: 'iife'
  },
  plugins: plugins(),
  onwarn,
}]
