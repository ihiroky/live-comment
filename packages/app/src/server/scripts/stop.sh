#!/bin/bash

cd $(dirname $0)

for t in streaming api
do
  pid=$(cat log/${t}.pid)
  kill ${pid}
  test $? -eq 0 && echo "${t} ${pid} stopped"
done
