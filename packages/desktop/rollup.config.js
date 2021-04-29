import fs from 'fs'
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace';

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
    nodeResolve({ browser: true }),
    commonjs(),
    env === 'production' && terser(),
  ]
}

export default [{
  input: 'dist/js/settings/index.js',
  output: {
    file: 'resources/settings/index.js',
    name: 'Settings',
    format: 'iife'
  },
  plugins: plugins(),
}, {
  input: 'dist/js/main/index.js',
  output: {
    file: 'resources/main/index.js',
    name: 'Screen',
    format: 'iife'
  },
  plugins: plugins(),
}];
