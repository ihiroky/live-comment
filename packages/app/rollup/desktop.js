import { plugins, onwarn, watch } from './c.js'

export default [{
  input: ['src/desktop/index.ts'],
  output: {
    file: 'dist/desktop/index.js',
    name: 'Main',
    format: 'cjs',
  },
  plugins: plugins(),
  onwarn,
  watch,
}, {
  input: ['src/desktop/preload.ts'],
  output: {
    file: 'dist/desktop/preload.js',
    name: 'Preload',
    format: 'cjs',
  },
  plugins: plugins(),
  onwarn,
  watch,
}, {
  input: ['src/desktop/renderer.tsx'],
  output: {
    file: 'resources/renderer.js',
    name: 'Renderer',
    format: 'es'
  },
  plugins: plugins([
    { src: 'src/screen/screen.css', dest: 'resources/' },
  ]),
  onwarn,
  watch,
}]
