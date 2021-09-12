import fs from 'fs'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import replace from '@rollup/plugin-replace'
import postcss from 'rollup-plugin-postcss'

const env = process.env.NODE_ENV || 'development'

fs.mkdirSync('dist/bundle', { recursive: true }, err => { if (err) console.log(err) })
fs.copyFileSync('public/index.html', 'dist/bundle/index.html')
fs.copyFileSync('src/index.css', 'dist/index.css')
fs.copyFileSync('src/App.css', 'dist/App.css')

function plugins() {
  return  [
    replace({
      'process.env.NODE_ENV': `"${env}"`,
      'preventAssignment': true
    }),
    postcss({ plugins: [] }),
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
  context: 'this',  // For react-cookie es6 module
  plugins: plugins(),
}]
