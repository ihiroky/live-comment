import path from 'node:path'

export const apps = {
  api: {
    entryPoints: ['src/server/api.ts'],
    outfile: 'dist/bundle/server/api.js',
  },
  streaming: {
    entryPoints: ['src/server/streaming.ts'],
    outfile: 'dist/bundle/server/streaming.js',
  },
  comment: {
    entryPoints: ['src/comment/index.tsx'],
    outfile: 'dist/bundle/comment/index.js',
    assets: [
      { src: 'src/public/*', destDir: 'dist/bundle/comment/' },
    ]
  },
  desktop: {
    // The order of entryPoints is important for rollup.
    entryPoints: ['src/desktop/index.ts', 'src/desktop/preload.ts'],
    outdir: 'dist/desktop/',
  },
  renderer: {
    entryPoints: ['src/desktop/renderer.tsx'],
    outfile: 'resources/renderer.js',
    // assets: [
    //   { src: 'src/public/*', destDir: 'dist/bundle/comment/' },
    // ]
  },
  extension: {
    // The order of entryPoints is important for rollup.
    entryPoints: [
      'src/extension/background.ts',
      'src/extension/contentScript.tsx',
      'src/extension/popup/popup.tsx',
      'src/extension/popup/comment.tsx'
    ],
    outdir: 'dist/bundle/extension/',
    assets: [
      { src: 'src/extension/manifest.json', destDir: 'dist/bundle/extension/' },
      { src: 'resources/icon*.png', destDir: 'dist/bundle/extension/images/'},
      { src: 'src/extension/options/options.html', destDir: 'dist/bundle/extension/options/' },
      { src: 'src/extension/popup/*.html', destDir: 'dist/bundle/extension/popup/' },
      { src: 'resources/logo.png', destDir: 'dist/bundle/extension/popup/'},
    ]
  }
}

export function toRollupCopyPluginFormat(entries) {
  return entries.map(e => {
    if (!e.src) {
      throw new Error('src does not exist.')
    }
    if (e.destFile) {
      return { src: e.src, dest: e.destFile }
    } else if (e.destDir) {
      return { src: e.src, dest: e.destDir }
    }
    throw new Error('Both destFile and destDir do not exist.')
  })
}

function findCommonRootDirectory(entryPoints) {
  const splitPaths = entryPoints
    .map(ep => path.dirname(ep))
    .map(epDir => epDir.split(path.sep))
  const shortestDepth = Math.min(...splitPaths.map(sp => sp.length))
  const commonPathElements = []

  DEPTH_LOOP:
  for (let i = 0; i < shortestDepth; i++) {
    const target = splitPaths[0][i]
    for (let ii = 1; ii < splitPaths.length; ii++) {
      if (splitPaths[ii][i] !== target) {
        break DEPTH_LOOP
      }
    }
    commonPathElements.push(target)
  }

  return commonPathElements.join(path.sep)
}

export function entryPointsToOutFiles(entryPoints, outdir) {
  const srcRootDir = findCommonRootDirectory(entryPoints)
  return entryPoints
    .map(ep => ep.substring(srcRootDir.length))
    .map(s => s.replace(/tsx?$/, 'js'))
    .map(s => path.join(outdir, s))
}