import { Plugin, PluginBuild } from 'esbuild'
import glob from 'glob'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

type Options = {
  entries: {
    src: string
    destFile?: string
    destDir?: string
  }[]
  initialDelayMs?: number
  debounceTimeoutMs?: number
  logLevel?: 'debug' | 'info' | 'error'
}

const LOGLEVEL_DEBUG = 2
const LOGLEVEL_INFO = 4
const LOGLEVEL_WARN = 6
const LOGLEVEL_ERROR = 8
const log = {
  level: LOGLEVEL_ERROR,
  setup(logLevel: Options['logLevel']): void {
    const logLevelDef = {
      debug: LOGLEVEL_DEBUG,
      info: LOGLEVEL_INFO,
      warn: LOGLEVEL_WARN,
      error: LOGLEVEL_ERROR,
    }
    log.level = logLevel ? logLevelDef[logLevel] : logLevelDef['info']
  },
  debug(...msg: unknown[]): void {
    if (log.level <= LOGLEVEL_DEBUG) {
      // eslint-disable-next-line no-console
      console.debug(...msg)
    }
  },
  info(...msg: unknown[]): void {
    if (log.level <= LOGLEVEL_INFO) {
      // eslint-disable-next-line no-console
      console.info(...msg)
    }
  },
  error(...msg: unknown[]): void {
    if (log.level <= LOGLEVEL_ERROR) {
      // eslint-disable-next-line no-console
      console.error(...msg)
    }
  }
}

function digest(file: string): Promise<string> {
  return new Promise((resolve: (digest: string) => void, reject: (err: Error) => void): void => {
    const hash = crypto.createHash('md5')
    const src = fs.createReadStream(file)
    src.on('data', (chunk: Buffer): void => { hash.update(chunk) })
    src.on('end', (): void => { resolve(hash.digest('hex')) })
    src.on('error', (err: Error): void => { reject(err) })
  })
}

async function canCopy(src: string, dest: string, destStat: fs.Stats | null): Promise<boolean> {
  if (destStat === null) {
    return true
  }
  const existsDest = await fs.promises.access(dest)
    .then(() => true)
    .catch(() => false)
  if (!existsDest) {
    // TODO test
    return true
  }

  const srcDigest = await digest(src)
  const destDigest = await digest(dest)
  return srcDigest !== destDigest
}

async function copyIfUpdated(src: string, dest: string, destStat: fs.Stats | null): Promise<void> {
  log.debug('copyIfUpdated', src, dest)
  const destFile = destStat && destStat.isDirectory()
    ? path.join(dest, path.basename(src))
    : dest

  const copyable = await canCopy(src, destFile, destStat)
  if (copyable) {
    await fs.promises.copyFile(src, destFile)
    log.info(`Copy ${src} to ${destFile}.`)
  }
}

/**
 * Traverse (src, dest) entries in the options.
 * Valid entry: (src, dest) = (file, file), (file, directory), (files(glob), directory)
 */
async function traverse(
  options: Options,
  callback: (src: string, dest: string, destStat: fs.Stats | null) => Promise<void>
): Promise<void> {
  for (const e of options.entries || []) {
    const dest = e.destFile ?? e.destDir
    if (!e.src || !dest) {
      continue
    }
    try {
      await fs.promises.access(dest)
    } catch (_: unknown) {
      const dir = e.destFile ? path.dirname(e.destFile) : dest
      await fs.promises.mkdir(dir, { mode: 0o755, recursive: true })
      log.debug(`Create directory: ${dir}`)
    }

    const destStat = await fs.promises.stat(dest).catch(() => null)

    // glob requires slashes for path separator.
    // https://github.com/isaacs/node-glob#windows
    const srcList = glob.sync(e.src.replaceAll('\\', '/'), { nodir: true })
    if (srcList.length > 1 && e.destFile) {
      log.error(`The src are multiple files, but dest is not a directory.`)
      continue
    }
    for (const src of srcList) {
      await fs.promises.access(src)
      const srcStat = await fs.promises.stat(src)
      if (!srcStat.isFile()) {
        log.error(`${src} is not a file. Stop copying it.`)
        continue
      }
      await callback(src, dest, destStat)
    }
  }
}

async function createWacher(
  src: string,
  dest: string,
  destStat: fs.Stats | null,
  debounceTimeoutMs: number
): Promise<fs.FSWatcher> {
  let debounceTimeout: NodeJS.Timeout | null = null
  const watcher = fs.watch(src, (eventType: string, fn: string): void => {
    log.debug(eventType, src, fn)
    switch (eventType) {
      case 'change':
        if (debounceTimeout) {
          return
        }
        log.debug(`Call copyIfUpdate after ${debounceTimeoutMs}ms.`)
        debounceTimeout = setTimeout((): void => {
          copyIfUpdated(src, dest, destStat)
          debounceTimeout = null
        }, debounceTimeoutMs)
        break
      case 'rename':
        log.debug(`rename ${src}`)
        break
    }
  })
  watcher.on('close', (): void => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
      debounceTimeout = null
    }
  })
  return watcher
}

async function createAllWatchers(options: Options): Promise<fs.FSWatcher[]> {
  const watchers: fs.FSWatcher[] = []
  await traverse(options, async (src: string, dest: string, destStat: fs.Stats | null): Promise<void> => {
    const watcher = await createWacher(src, dest, destStat, options.debounceTimeoutMs ?? 200)
    log.debug(`Create watcher for ${src}`)
    watchers.push(watcher)
  })
  return watchers
}

async function copyOnce(options: Options): Promise<void> {
  await traverse(
    options,
    async (src: string, dest: string, destStat: fs.Stats | null): Promise<void> => (
      await copyIfUpdated(src, dest, destStat)
    )
  )
}

type FSWatcherCloseable = {
  _watchers: Array<fs.FSWatcher>
  close: () => void
}

function changeEnumerable(p: ReturnType<typeof copyFiles>, key: keyof FSWatcherCloseable, enumerable: boolean): void {
  const desc = Object.getOwnPropertyDescriptor(p, key)
  if (!desc) {
    throw new Error(`Unexpected key ${key} for ${p}.`)
  }
  desc.enumerable = enumerable
  Object.defineProperty(p, key, desc)
}

export const copyFiles = (options: Options): Plugin & FSWatcherCloseable => {
  const plugin = {
    name: 'copy-files',
    setup: (build: PluginBuild): void | Promise<void> => {
      log.setup(options.logLevel)
      if (build.initialOptions.watch) {
        return new Promise<void>((resolve: () => void, reject: (reason: unknown) => void): void => {
          setTimeout((): void => {
            copyOnce(options)
              .then((): Promise<fs.FSWatcher[]> => createAllWatchers(options))
              .then((watchers: fs.FSWatcher[]): void => {
                plugin._watchers = watchers
                resolve()
              })
              .catch(reject)
          }, options.initialDelayMs ?? 3000)
        })
      }
      build.onEnd(async (): Promise<void> => {
        await copyOnce(options)
      })
    },
    _watchers: new Array<fs.FSWatcher>(),
    close: (): void => {
      plugin._watchers.forEach((w: fs.FSWatcher): void => {
        w.close()
      })
    }
  }

  // Avoiding validation of plugin properties.
  changeEnumerable(plugin, '_watchers', false)
  changeEnumerable(plugin, 'close', false)

  return plugin
}
