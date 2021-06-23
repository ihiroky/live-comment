import fs from 'fs'
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript'

const env = process.env.NODE_ENV || 'development';

function copy(from, to) {
  console.log(`Copy ${from} to ${to}.`)
  fs.copyFileSync(from, to)
}

copy('../screen/src/screen.css', 'resources/main/index.css')

function plugins() {
  return  [
    replace({
      'process.env.NODE_ENV': `"${env}"`,
      'preventAssignment': true
    }),
    typescript(),
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    env === 'production' && terser(),
  ]
}

export default [{
  input: 'src/main/index.tsx',
  output: {
    file: 'resources/main/index.js',
    name: 'Screen',
    format: 'iife'
  },
  plugins: plugins(),
}, {
  input: 'src/settings/index.tsx',
  output: {
    file: 'resources/settings.js',
    name: 'Settings',
    format: 'iife'
  },
  plugins: plugins(),
}, {
  input: 'src/poll/index.tsx',
  output: {
    file: 'resources/poll.js',
    name: 'Screen',
    format: 'iife'
  },
  plugins: plugins(),
}];
