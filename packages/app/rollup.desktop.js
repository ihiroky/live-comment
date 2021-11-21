import fs from 'fs'
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';

const env = process.env.NODE_ENV || 'development';

function copy(from, to) {
  console.log(`Copy ${from} to ${to}.`)
  fs.copyFileSync(from, to)
}

copy('src/screen/screen.css', 'resources/main/index.css')

function plugins() {
  return  [
    replace({
      'process.env.NODE_ENV': `"${env}"`,
      'preventAssignment': true
    }),
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    typescript(),
    commonjs(),
    env === 'production' && terser(),
  ]
}

export default [{
  input: 'src/desktop/main/index.tsx',
  output: {
    file: 'resources/main/index.js',
    name: 'Screen',
    format: 'iife'
  },
  plugins: plugins(),
}, {
  input: 'src/desktop/settings/index.tsx',
  output: {
    file: 'resources/settings.js',
    name: 'Settings',
    format: 'iife'
  },
  plugins: plugins(),
}, {
  input: 'src/desktop/poll/index.tsx',
  output: {
    file: 'resources/poll.js',
    name: 'Poll',
    format: 'iife'
  },
  plugins: plugins(),
}]
