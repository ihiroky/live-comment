#!/bin/bash

cd $(dirname $0)

. ./functions.sh

stop_process testing streaming
stop_process testing api

clean_old_log testing

start_process testing streaming -p 8081 -c /home/hiroki/.config/live-comment/server.config.t-rokiscreen.json
start_process testing api -p 9081 -c /home/hiroki/.config/live-comment/server.config.t-rokiscreen.json
