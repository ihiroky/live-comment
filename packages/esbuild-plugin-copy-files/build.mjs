import { build } from 'esbuild'

build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: ['es2020'],
  outfile: 'dist/index.js',
  minify: false,
})
