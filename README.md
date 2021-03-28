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
    alias /path/to/live-comment/packages/comment/build/;
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
yarn --cwd packages/server start
```

### Client

- Clone (if required)
```bash
git clone https://github.com/ihiroky/live-comment.git
```

- Edit `url` property in live-comment/packages/screen/index.tsx to the URL of the websocket server that works on your server.

- Build
```bash
cd live-comment
yarn install
yarn --cwd packages/screen build
yarn --cwd packages/desktop package:linux     # for Linux
# or yarn --cwd packages/desktop package:mac  # for Mac (under construction)
# or yarn --cwd packages/desktop package:win  # for Windows (under construction)
```

Then, install generated package in live-comment/packages/desktop/dist directory.

## How to use the client

### Display screen to show comments

Execute the executable file included in the installed package.

### Post comments from web browser

Access to comment/index.html served on your http server. e.g. `https://<your-server>/comment/index.html`
