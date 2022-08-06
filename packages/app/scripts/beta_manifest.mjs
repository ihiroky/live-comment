import fsp from 'node:fs/promises'

const inputPath = 'src/extension/manifest.json'
const outputPath = 'dist/bundle/extension/manifest.json'

const manifestJSON = await fsp.readFile(inputPath)
const manifest = JSON.parse(manifestJSON.toString('utf8'))
const modifiedJSON = JSON.stringify({
  ...manifest,
  name: `[BETA] ${manifest.name}`,
  description: `THIS EXTENSION IS FOR BETA TESTING.\n\n${manifest.description}`
}, undefined, 2)
await fsp.writeFile(outputPath, modifiedJSON)
