# live-comment

Show audiences' comments on your screen.

## Archtitecture

```
       |           [api] [streaming]
       |             |        |
       |             +--v-----+
Server |     [html]     |
       |     [http server/reverse proxy] (optional)
-------|        |       |
       |        |  +----^----+
       |        |  |         |
Client | [post comments] [show comments]

[post comments]: Web page to post comments.
[show comments]: Desktop application to show comments on your screen.
```

## Start servers and clients for development

### Build and watch all applications
```bash
yarn --cwd packages/esbuild-plugin-copy-files/ build
yarn --cwd packages/app/ watch
```

### Start servers
```bash
yarn --cwd packages/app/ serve
# Start streaming server on port 8080
# Start api server on port 9080
# Start comment page server on port 8888 (http://localhost:8888/login)
```

### Start desktop application
```bash
yarn --cwd packages/app/ start-desktop
# And change Server URL to the streaming server (ws://localhost:8080/app) in its settings.
```
