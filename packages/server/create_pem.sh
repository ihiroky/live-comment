#!/bin/bash

CN=${1:-localhost}

test -f dist/key.pem \
  && test -f dist/cert.pem \
  && echo 'PEM files already exist.' \
  && exit 0

openssl req -x509 -newkey rsa:4096 -sha256 -nodes -keyout dist/key.pem -out dist/cert.pem -subj "/CN=${CN}" -days 3650
