import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import replace from '@rollup/plugin-replace'
import json from '@rollup/plugin-json'
import copy from 'rollup-plugin-copy'

export const env = process.env.NODE_ENV || 'development'

function hungup_workaround_for_github_actions() {
  return {
    name: 'windows_hugnup_workaround',
    order: 'post',
    closeBundle() {
      if (!process.env.ROLLUP_WATCH) {
        // eslint-disable-next-line no-console
        console.info('Call process.exit(0) to prevent hungup')
        setTimeout(() => process.exit(0))
      }
    },
  }
}

export function plugins(targets) {
  return [
    targets && copy({ targets, verbose: true }),
    replace({
      'process.env.NODE_ENV': `"${env}"`,
      'process.env.LC_WS_URL': `"${process.env.LC_WS_URL ?? ''}"`,
      'process.env.LC_API_URL': `"${process.env.LC_API_URL ?? ''}"`,
      'process.env.LC_APP_URL': `"${process.env.LC_APP_URL ?? ''}"`,
      'process.env.LC_ORIGIN_URL': `"${process.env.LC_APP_URL ?? ''}"`,
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

export function plugins_for_last_process(targets) {
  const p = plugins(targets)
  return p.concat(hungup_workaround_for_github_actions())
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
