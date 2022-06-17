# live-comment

Show audiences' comments on your screen.

## Archtitecture

```
       |           [api] [streaming]
       |             +--v-----+
Server |      [html]    |
       |      [http server] (optional)
       |        |       |
       |        +  +----^----+
Client | [post comments] [show comments]

[post comments]: Web page to post comments.
[show comments]: Desktop pplication to show comments.
```

## How to setup

### Requirements

- node
- yarn
- Http server (optional)

### Server side

- Clone and build

```bash
git clone https://github.com/ihiroky/live-comment.git
cd live-comment
yarn install
yarn --cwd packages/comment build
yarn --cwd packages/server build
```

- Configure reverse proxy

e.g. Nginx
```
server {

  # ...

  location / {
    root /path/to/live-comment/packages/comment/build/;
    try_files $uri /index.html;
  }
  location /app {
    proxy_pass http://localhost:8080;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
  location /api/ {
    proxy_pass http://localhost:9080/;
  }
  proxy_set_header X-Forwarded-Host $host;
  proxy_set_header X-Forwarded-For $remote_addr;

  # ...

}
```

If you don't use reverse proxy, /path/to/live-comment/packages/comment/build must be served and expose 8080 port used by the server.

- Start streaming and api server

```bash
# Generate jwt keys, then move generated keys into a secure directory and write their path in server.config.json
./script/genjwtkey.sh

cd /path/to/live-comment/packages/server
vi server.config.json  # Add room name and password :(, and above jwt key path.
node dist/bundle/server/streaming.js -p 8080
node dist/bundle/serverapi.js -p 9080
```

### Client side

- Clone
```bash
git clone https://github.com/ihiroky/live-comment.git
```

- Build desktop app
```bash
cd live-comment
yarn install
cd packages/desktop
yarn build
yarn electron-builder -c electron-builder-config.json -l # Build install package for Linux
yarn electron-builder -c electron-builder-config.json -w # Build install package for Windows
yarn electron-builder -c electron-builder-config.json -m # Build install package for Mac
```

Then, install generated package in live-comment/packages/desktop/dist directory and access to .

## Start servers and clients to develop

### Build all applications
```bash
cd packages/app
yarn build all
```

### Start servers
```bash
cd packages/app
yarn serve
# Starts streaming server on port 8080
# Starts api server on port 9080
# Starts comment page server on port 18080 (http://localhost:18080/login)
```

### Start desktop application
```bash
yarn electron . --open-dev-tools
# And change Server URL to ws://localhost:8080/app in its settings.
```
