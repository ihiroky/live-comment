# server

## Generate key for JWT
```bash
# Private key
ssh-keygen -t ecdsa -b 256 -m PEM -f jwt.key
# Public key
openssl ec -in jwt.key -pubout -outform PEM -out jwt.key.pub
```
