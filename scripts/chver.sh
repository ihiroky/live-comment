#!/bin/bash

cd $(dirname $0)/..

version="$1"
test -z "$version" \
  && echo " Usage: $0 <version>" \
  && exit 1

function verup()
{
  local dir="$1"
  yarn --silent --cwd ${dir} version --new-version "${version}" --no-git-tag-version
}

node -e "
const fs = require('node:fs')

const manifestPath = 'packages/app/src/extension/manifest.json'

const manifestJSON = fs.readFileSync(manifestPath)
const manifest = JSON.parse(manifestJSON.toString('utf8'))
const modifiedJSON = JSON.stringify({
  ...manifest,
  version: '${version}'
}, undefined, 2)
fs.writeFileSync(manifestPath, modifiedJSON)
"

verup .
verup packages/app
