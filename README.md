# live-comment

## How to setup

### Requirements

- node
- yarn
- Http server (optional)

### Server

- Clone and build

```bash
git clone https://github.com/ihiroky/live-comment.git
cd live-comment
yarn install
yarn --cwd packages/comment build
yarn --cwd packages/server build
```

- Configure http server (optional)

e.g. Nginx
```
server {

  # Your server name
  server_name live-comment.ml;

  location /comment/ {
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

If you don't use http server, /path/to/live-comment/packages/comment/build must be served and expose 8080 port used by the server.

- Start websocket server
```bash
cd /path/to/live-comment/
vi server.config.json  # Add room name and password :(
nohup yarn --cwd packages/server start >nohup.out 2>&1 &
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
yarn --cwd packages/screen build
cd packages/desktop
yarn install           # desktop is not a member of workspace
yarn package:linux     # for Linux
yarn package:win       # for Windows
# or yarn package:mac  # for Mac (under construction)
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
```

### Start desktop application
```bash
cd packages/desktop
yarn build:screen
yarn build
cd dist/linux-unpacked
./live-comment ws://localhost:8080  # Connect to the streaming server regardless of its settings.
```
