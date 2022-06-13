import { plugins, onwarn } from './c.js'

export default [{
  external: ['electron'],
  input: 'src/desktop/preload/main.ts',
  output: {
    file: 'dist/bundle/desktop/preload/main.js',
    name: 'Main',
    format: 'cjs',
  },
  plugins: plugins(),
  onwarn,
}, {
  external: ['electron'],
  input: 'src/desktop/preload/settings.ts',
  output: {
    file: 'dist/bundle/desktop/preload/settings.js',
    name: 'Settings',
    format: 'cjs',
  },
  plugins: plugins(),
  onwarn,
}, {
  external: ['electron'],
  input: 'src/desktop/preload/poll.ts',
  output: {
    file: 'dist/bundle/desktop/preload/poll.js',
    name: 'Poll',
    format: 'cjs',
  },
  plugins: plugins(),
  onwarn,
}]
