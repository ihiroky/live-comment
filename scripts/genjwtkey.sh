#!/bin/bash

KEY=jwt-$(date +%Y%m%d-%H%M%S).key

ssh-keygen -t ecdsa -b 256 -m PEM -f ${KEY}
openssl ec -in ${KEY} -pubout -outform PEM -out ${KEY}.pub
