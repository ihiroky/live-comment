import fs from 'fs'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import replace from '@rollup/plugin-replace'

const env = process.env.NODE_ENV || 'development'

fs.mkdirSync('dist/bundle', { recursive: true }, err => { if (err) console.log(err) })
fs.copyFileSync('public/index.html', 'dist/bundle/index.html')

function plugins() {
  return  [
    replace({
      'process.env.NODE_ENV': `"${env}"`,
      'preventAssignment': true
    }),
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    env === 'production' && terser(),
  ]
}

export default [{
  input: 'dist/index.js',
  output: {
    file: 'dist/bundle/main.js',
    name: 'Screen',
    format: 'iife'
  },
  watch: {
    buildDelay: 3333,
  },
  context: 'this',  // For react-cookie es6 module
  plugins: plugins(),
}]
