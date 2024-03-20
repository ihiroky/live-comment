#!/bin/bash

cd $(dirname $0)

. ./functions.sh

for t in streaming api
do
  stop_process testing $t
done
