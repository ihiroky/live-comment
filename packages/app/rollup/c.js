/* eslint-disable no-console */

import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'
import replace from '@rollup/plugin-replace'
import json from '@rollup/plugin-json'
import fs from 'fs'

export const env = process.env.NODE_ENV || 'development'

export function copy(from, to) {
  console.log(`Copy ${from} to ${to}.`)
  fs.copyFileSync(from, to)
}

export function plugins() {
  return  [
    replace({
      'process.env.NODE_ENV': `"${env}"`,
      'preventAssignment': true
    }),
    nodeResolve({
      preferBuiltins: true,
    }),
    typescript(),
    commonjs(),
    json(),
    process.env.NODE_ENV === 'production' && terser(),
  ]
}

const ignoreWarnPath = [
  '/yargs/build/lib/yargs-factory.js',
  '/unzip/unzip.min.js',
  '/depd/index.js',
]

export function onwarn(warning, defaultHandler) {
  const loc = warning.loc
  const cycle = warning.cycle
  if (
    process.env.CI !== 'true' && (
      (loc && ignoreWarnPath.some(p => loc.file.endsWith(p))) ||
      (cycle && ignoreWarnPath.some(p => cycle[0].endsWith(p)))
    )
  ) {
    return
  }
  defaultHandler(warning)
}