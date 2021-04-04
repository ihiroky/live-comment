import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from 'rollup-plugin-terser';
import replace from '@rollup/plugin-replace'

const env = process.env.NODE_ENV || 'development';

export default {
  input: 'dist/js/settings/index.js',
  output: {
    file: 'resources/settings/index.js',
    name: 'Settings',
    format: 'iife'
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': `"${env}"`,
      'preventAssignment': true
    }),
    nodeResolve({ browser: true }),
    commonjs(),
    env === 'production' && terser(),
  ],
};