/* eslint-disable no-console */
import { Plugin, PluginBuild } from 'esbuild'
import glob from 'glob'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

function digest(file: string): Promise<string> {
  return new Promise((resolve: (digest: string) => void, reject: (err: Error) => void): void => {
    const hash = crypto.createHash('md5')
    const src = fs.createReadStream(file)
    src.on('data', (chunk: Buffer): void => { hash.update(chunk) })
    src.on('end', (): void => { resolve(hash.digest('hex')) })
    src.on('error', (err: Error): void => { reject(err) })
  })
}
async function canCopy(src: string, dest: string): Promise<boolean> {
  const srcDigest = await digest(src)
  try {
    await fs.promises.access(dest)
    const destDigest = await digest(dest)
    return srcDigest !== destDigest
  } catch (_: unknown) {
    return true
  }
}

async function copyIfUpdated(src: string, dest: string): Promise<void> {
  const copyable = await canCopy(src, dest)
  if (copyable) {
    await fs.promises.copyFile(src, dest)
    console.info(`Copy ${src} to ${dest}.`)
  }
}

type Options = {
  entries: {
    src: string
    destFile?: string
    destDir?: string
  }[]
}
export const copyFile = (options:Options): Plugin => ({
  name: 'copy-files',
  setup: (build: PluginBuild): void => {
    build.onEnd(async (): Promise<void> => {
      const entries = options.entries || []
      for (const e of entries) {
        const dest = e.destFile ?? e.destDir
        if (!e.src || !dest) {
          continue
        }

        if (e.destFile) {
          await fs.promises.access(dest)
        } else if (e.destDir) {
          try {
            await fs.promises.access(dest)
          } catch (_: unknown) {
            await fs.promises.mkdir(e.destDir, { mode: 0o755, recursive: true })
            console.debug(`Create directory: ${dest}`)
          }
        }
        const destStat = await fs.promises.stat(dest)
        if ((destStat.isFile() && !e.destFile) || (destStat.isDirectory() && !e.destDir)) {
          const prefix = e.destFile
            ? `destFile ${e.destFile} is not a file`
            : `destDir ${e.destDir} is not a directory`
          console.error(`${prefix}. Stop copying ${e.src}.`)
          continue
        }
        for (const src of glob.sync(e.src, { nodir: true })) {
          await fs.promises.access(src)
          const srcStat = await fs.promises.stat(src)
          if (!srcStat.isFile()) {
            console.error(`${src} is not a file. Stop copying it.`)
            continue
          }
          if (destStat.isFile()) {
            await copyIfUpdated(src, dest)
          } else if (destStat.isDirectory()) {
            const destFile = path.join(dest, path.basename(src))
            await copyIfUpdated(src, destFile)
          }
        }
      }
    })
  },
})
