# esbiuld-plugin-copy-files
Copy modified files with glob and watch support.

## Usage
```typescript
import { build } from 'esbuild'
import { copyFiles } from 'esbuild-plugin-copy-files'

build({
  ...,
  watch: ..., // if not falsely, watch target files independently of esbuild itself.
  plugins: [
    copyFiles({
      entries: [
        { src: 'src/manifest.json', destFile: 'dist/extension/manifest.json' },
        { src: 'src/extension/popup/*.html', destDir: 'dist/bundle/extension/popup/' },
        { src: 'resources/icon.png', destDir: 'dist/extension/images/'} ,
        { src: 'resources/icon@[236].png', destDir: 'dist/extension/images/'} ,
      ],
      initialDelayMs: 3000,
      debounceTimeoutMs: 200,
      logLevel: 'error',
    }),
  ],
})
```

## Configurations

### entries

Type: `Array<{ src: string, destFile?: string, destDir?: string }>`

Defalut: `[]`

Array of entries to copy.

- src: Source path or glob to copy. Glob expression is based on https://github.com/isaacs/node-glob.
- destFile: Desitination file path to copy.
- destDir: Desitination directory to copy into. Create if not exists.

### initialDelayMs

Type: `number` or `undefined`

Default: `3000`

Delay milliseconds to start watch. Available if enables esbuild watch mode.

### debounceTimeoutMs

Type: `number` or `undefined`

Default: `200`

Debounce timeout milliseconds to copy files on watch mode. The copy is made only once after the timeout for the file saves that occur within this time period.

### logLevel

Type: `'error'`, `'info'`, `'debug'`

Default: `'info'`

Prints message to debug.
