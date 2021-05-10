#!/bin/bash

cd $(dirname $0)

mkdir -p log
test -f log/pid \
  && kill $(cat log/pid) 2>/dev/null \
  && echo Stop running process $(cat log/pid).
while read f
do
  rm -f $f
done < <(ls -t log/nohup*.out | tail +3)

nohup node dist/bundled/index.js >log/nohup-$(date +%Y%m%d-%H%M%S).out 2>&1 &
echo $! >log/pid
echo Start new process $!
