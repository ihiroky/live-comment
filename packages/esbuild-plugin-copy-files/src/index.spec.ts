/* eslint-disable @typescript-eslint/no-explicit-any */
import { copyFiles } from './index'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PluginBuild } from 'esbuild'
import { jest, beforeEach, afterEach, describe, expect, test } from '@jest/globals'


let tempDirPath: string

beforeEach(async () => {
  tempDirPath = await fsp.mkdtemp(path.join(os.tmpdir(), 'esbuild-plugin-copy-files-'))
})

afterEach(async () => {
  if (tempDirPath !== undefined) {
    await fsp.rm(tempDirPath, { recursive: true, force: true })
  }
})

function normalize(s: string): string {
  // path separator must be slash in glob expression even if running on Windows.
  // https://github.com/isaacs/node-glob#windows
  return s.replaceAll('\\', '/')
}

describe('copyOnce', () => {
  async function callCopyOnce(entries: Parameters<typeof copyFiles>[0]['entries']): Promise<void> {
    const plugin = copyFiles({ entries })
    const build = {
      initialOptions: {},
      onEnd: jest.fn<PluginBuild['onEnd']>(),
    }
    plugin.setup(build as any)
    expect(build.onEnd).toBeCalledWith(expect.any(Function))
    const func = jest.mocked<PluginBuild['onEnd']>(build.onEnd).mock.calls[0][0]
    await func({
      errors: [],
      warnings: [],
    })
  }

  test('Copy a file to a file', async () => {
    const srcFile = path.join(tempDirPath, 'srcFile')
    const destFile = path.join(tempDirPath, 'destFile')
    await fsp.writeFile(srcFile, 'srcFile')

    await callCopyOnce([
      { src: normalize(srcFile), destFile: destFile }
    ])

    const destContent = await fsp.readFile(destFile, { encoding: 'utf8' })
    expect(destContent).toBe('srcFile')
  })

  test('Copy a file to a directory', async () => {
    const srcFile = path.join(tempDirPath, 'srcFile')
    const destDir = path.join(tempDirPath, 'destDir')
    await fsp.writeFile(srcFile, 'srcFile')
    await fsp.mkdir(destDir, { recursive: true })

    await callCopyOnce([
      { src: normalize(srcFile), destDir: destDir }
    ])

    const destFile = path.join(destDir, path.basename(srcFile))
    const destContent = await fsp.readFile(destFile, { encoding: 'utf8' })
    expect(destContent).toBe('srcFile')
  })

  test('Copy files (glob) to a directory', async () => {
    const srcFiles = [
      path.join(tempDirPath, 'srcFile0'),
      path.join(tempDirPath, 'srcFile1'),
      path.join(tempDirPath, 'srcFile2'),
    ]
    const destDir = path.join(tempDirPath, 'destDir')
    srcFiles.map((p, i) => fsp.writeFile(p, `srcFile${i}`))
    await fsp.mkdir(destDir, { recursive: true })

    await callCopyOnce([
      { src: normalize(`${tempDirPath}/srcFile[012]`), destDir: destDir },
    ])

    for (const i of [0, 1, 2]) {
      const destFile = path.join(destDir, path.basename(srcFiles[i]))
      const destContent = await fsp.readFile(destFile, { encoding: 'utf8'})
      expect(destContent).toBe(`srcFile${i}`)
    }
  })

  test('Skip if src is empty', async () => {
    const srcFile = path.join(tempDirPath, 'srcFile')
    const destDir = path.join(tempDirPath, 'destDir')
    await fsp.writeFile(srcFile, 'srcFile')
    await fsp.mkdir(destDir, { recursive: true })

    await callCopyOnce([
      { src: '', destDir: destDir }, // Skipped
      { src: normalize(srcFile), destDir: destDir },
    ])

    const files = await fsp.readdir(destDir)
    expect(files.map(f => path.basename(f))).toEqual(['srcFile'])
  })

  test('Skip if both destFile and destDir are undefined', async () => {
    const srcFile0 = path.join(tempDirPath, 'srcFile0')
    const srcFile1 = path.join(tempDirPath, 'srcFile1')
    const destDir = path.join(tempDirPath, 'destDir')
    await fsp.writeFile(srcFile0, 'srcFile0')
    await fsp.writeFile(srcFile1, 'srcFile1')

    await callCopyOnce([
      { src: normalize(srcFile0) },
      { src: normalize(srcFile1), destDir: destDir },
    ])

    const files = await fsp.readdir(destDir)
    expect(files.map(f => path.basename(f))).toEqual(['srcFile1'])
  })

  test('Skip if src is glob (multiple files) and dest is a file', async () => {
    const srcFile0 = path.join(tempDirPath, 'srcFile0')
    const srcFile1 = path.join(tempDirPath, 'srcFile1')
    const destFile = path.join(tempDirPath, 'destFile')
    await fsp.writeFile(srcFile0, 'srcFile0')
    await fsp.writeFile(srcFile1, 'srcFile1')
    await fsp.writeFile(destFile, 'destFile')

    await callCopyOnce([
      { src: normalize(path.join(tempDirPath, 'srcFile[01]')), destFile: destFile },
    ])

    const destContent = await fsp.readFile(destFile, { encoding: 'utf8' })
    expect(destContent).toBe('destFile')
  })

  test('Skip if src and dest are the same content.', async () => {
    const srcFile = path.join(tempDirPath, 'srcFile')
    const destFile = path.join(tempDirPath, 'destFile')
    await fsp.writeFile(srcFile, 'hogefuga')
    await fsp.writeFile(destFile, 'hogefuga')
    await fsp.utimes(destFile, 0, 0)

    await callCopyOnce([
      { src: normalize(srcFile), destFile: destFile }
    ])

    const destStat = await fsp.stat(destFile)
    expect(destStat.mtime.getTime()).toBe(0)
  })
})

describe('Watch', () => {

  function waitFor(func: () => void | Promise<void>): Promise<void> {
    return new Promise<void>((resolve: () => void, reject: (reason: unknown) => void): void => {
      const deadline = Date.now() + 1000
      const execute = (): void => {
        setTimeout((): void | Promise<void> => {
          try {
            const p = func()
            if (p instanceof Promise) {
              p.then(resolve)
            } else {
              resolve()
            }
            resolve()
          } catch(e: unknown) {
            if (deadline >= Date.now()) {
              reject(e)
              return
            }
            execute()
          }
        }, 10)
      }
      execute()
    })
  }

  test('Copy changed files', async () => {
    const srcFiles = [
      path.join(tempDirPath, 'srcFile0'),
      path.join(tempDirPath, 'srcFile1'),
      path.join(tempDirPath, 'srcFile2'),
    ]
    const destDir = path.join(tempDirPath, 'destDir')
    for (const s of srcFiles) {
      await fsp.writeFile(s, s)
    }

    const debounceTimeoutMs = 200
    const plugin = copyFiles({
      entries: [
        { src: normalize(path.join(tempDirPath, 'srcFile*')), destDir },
      ],
      initialDelayMs: 0,
      debounceTimeoutMs,
    })
    const build = {
      initialOptions: {
        watch: true,
      },
    }

    try {
      await plugin.setup(build as PluginBuild)
      await fsp.writeFile(srcFiles[0], 'changed0')
      await fsp.writeFile(srcFiles[2], 'changed2')
      await waitFor(async () => {
        const c0 = await fsp.readFile(path.join(tempDirPath, 'srcFile0'), { encoding: 'utf8' })
        expect(c0).toBe('changed0')
        const c1 = await fsp.readFile(path.join(tempDirPath, 'srcFile1'), { encoding: 'utf8' })
        expect(c1).toBe(srcFiles[1])
        const c2 = await fsp.readFile(path.join(tempDirPath, 'srcFile2'), { encoding: 'utf8' })
        expect(c2).toBe('changed2')
      })
    } finally {
      plugin.close()
    }

    // plugin.close() is flaky because copyIfUpdated() invocation is asynchronous
    await new Promise(resolve => setTimeout(resolve, debounceTimeoutMs + 100))
  })

})
