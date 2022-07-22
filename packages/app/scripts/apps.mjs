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

export function entryPointsToOutFiles(entryPoints, outdir) {
  return entryPoints.map(ep => {
    const ext = path.extname(ep)
    const bn = path.basename(ep, ext)
    return path.join(outdir, `${bn}.js`)
  })
}