#!/bin/bash

[ -z "$DAYS" ] && DAYS=365

for i in sp-decryption sp-signing
do
  echo "*** Generate $i key and certificate ***"
  openssl req -x509 -new -newkey rsa:4096 -nodes -keyout ${i}-key.pem -out ${i}-cert.pem -days $DAYS
done
