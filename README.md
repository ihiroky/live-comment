# live-comment

## How to setup

### Requirements

- node
- yarn
- Http server

### Server

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

  # Your server name
  server_name your-server-name;

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
}
```

If you don't use reverse proxy, /path/to/live-comment/packages/comment/build must be served and expose 8080 port used by the server.

- Start websocket server
```bash
cd /path/to/live-comment/packages/server
vi server.config.json  # Add room name and password :(
node dist/js/index.js
```

### Client

- Clone
```bash
git clone https://github.com/ihiroky/live-comment.git
```

- Build
```bash
cd live-comment
yarn install
cd packages/desktop
yarn build
yarn electron-builder -c electron-builder-config.json -l # for Linux
yarn electron-builder -c electron-builder-config.json -w # for Windows
yarn electron-builder -c electron-builder-config.json -m # for Mac
```

Then, install generated package in live-comment/packages/desktop/dist directory.

## How to use the client

### Display screen to show comments

Execute the executable file included in the installed package.

### Post comments from web browser

Access to comment/index.html served on your http server. e.g. `https://<your-server>/login`


## Start servers and client to develop

### Start streaming server
```bash
cd packages/server
yarn start  # Starts http/ws server on port 8080
```
### Serve comment from on development server
```bash
cd packages/comment
yarn start  # Starts http server on port 3000
# Access http://localhost:3000/login
```

### Start desktop application
```bash
cd packages/desktop
yarn build
yarn electron . --open-dev-tools
# And change Server URL to ws://localhost:8080/app in the settings.
```
