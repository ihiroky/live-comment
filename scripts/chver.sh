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

verup .
verup packages/comment
verup packages/server
verup packages/desktop
