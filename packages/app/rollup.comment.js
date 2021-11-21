import fs from 'fs'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'
import replace from '@rollup/plugin-replace'

const env = process.env.NODE_ENV || 'development'

fs.mkdirSync('dist/bundle/comment/', { recursive: true }, err => { if (err) console.log(err) })
fs.copyFileSync('public/index.html', 'dist/bundle/comment/index.html')

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
    typescript(),
    commonjs(),
    env === 'production' && terser(),
  ]
}

export default [{
  input: 'src/comment/index.tsx',
  output: {
    file: 'dist/bundle/comment/main.js',
    name: 'Comment',
    format: 'iife'
  },
  watch: {
    buildDelay: 3333,
  },
//  context: 'this',  // For react-cookie es6 module
  plugins: plugins(),
}]
