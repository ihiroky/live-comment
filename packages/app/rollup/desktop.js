import { plugins, onwarn, watch } from './c.js'

export default {
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
}
