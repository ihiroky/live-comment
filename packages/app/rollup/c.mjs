import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'
import replace from '@rollup/plugin-replace'
import json from '@rollup/plugin-json'
import copy from 'rollup-plugin-copy'
import os from 'node:os'

export const env = process.env.NODE_ENV || 'development'

function hungup_workaround_for_github_actions_on_windows() {
  return {
    name: 'windows_hugnup_workaround',
    order: 'post',
    closeBundle() {
      if (os.platform() === 'win32' && !process.env.ROLLUP_WATCH) {
        setTimeout(() => process.exit(0), 3000)
      }
    },
  }
}

export function plugins(targets) {
  return  [
    targets && copy({ targets, verbose: true }),
    replace({
      'process.env.NODE_ENV': `"${env}"`,
      'process.env.LC_WS_URL': `"${process.env.LC_WS_URL ?? ''}"`,
      'process.env.LC_API_URL': `"${process.env.LC_API_URL ?? ''}"`,
      'preventAssignment': true
    }),
    nodeResolve({
      preferBuiltins: true,
    }),
    typescript(),
    commonjs(),
    json(),
    process.env.NODE_ENV === 'production' && terser(),
    hungup_workaround_for_github_actions_on_windows(),
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
  if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
    return
  }
  defaultHandler(warning)
}

export const watch = {
  clearScreen: false,
  exclude: ['node_modules/**', 'dist/**'],
  include: ['src/**', 'rollup/**'],
}
