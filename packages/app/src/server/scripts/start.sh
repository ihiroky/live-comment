#!/bin/bash

cd $(dirname $0)

. ./functions.sh

stop_process prod streaming
stop_process prod api

clean_old_log prod

start_process prod streaming -p 8080
start_process prod api -p 9080
