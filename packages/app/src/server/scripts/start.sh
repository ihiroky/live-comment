#!/bin/bash

cd $(dirname $0)

function clean_pid_file() {
  local pid="${1}.pid"
  test -f log/${pid} \
    && kill $(cat log/${pid}) 2>/dev/null \
    && echo Stop running process $(cat log/${pid}).
}

function clean_old_log() {
  while read f
  do
    rm -f $f
  done < <(ls -t log/nohup*.out | tail +3)
}

function start_process() {
  local type="${1}"
  shift 1
  nohup node ${type}/index.js "$@" >log/nohup-${type}-$(date +%Y%m%d-%H%M%S).out 2>&1 &
  echo $! >log/${type}.pid
  echo Start new ${type} process $!
}

mkdir -p log
clean_pid_file streaming
clean_pid_file api

clean_old_log

start_process streaming -p 8080
start_process api -p 9080
