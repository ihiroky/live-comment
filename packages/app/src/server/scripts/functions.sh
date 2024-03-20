function stop_process() {
  local tag="${1}"
  local type="${2}"
  local pid_path="log/${tag}/${type}.pid"

  test -f $pid_path \
    && kill $(cat $pid_path) 2>/dev/null \
    && echo Stop running process $(cat $pid_path).
}

function clean_old_log() {
  local tag=${1}
  while read f
  do
    rm -f $f
  done < <(ls -t log/${tag}/nohup*.out | tail +3)
}

function start_process() {
  local tag="${1}"
  local type="${2}"
  local pid_path="log/${tag}/${type}.pid"
  shift 2

  mkdir -p log/${tag}
  nohup node ./${type}.js "$@" >log/${tag}/nohup-${type}-$(date +%Y%m%d-%H%M%S).out 2>&1 &
  echo $! >$pid_path
  echo Start new ${type} process $!
}
