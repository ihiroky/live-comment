# live-comment

Show audiences' comments on your screen.

## Architecture

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
Browser extension version of the client has the ability to both post comments and show comments.
The release in this repository will not include the browser extension because it contains specific host information. If need yours, build it yourself by specifying your host information.


## Start servers and clients for development

### Fetch dependencies
```bash
npm install
```

### Build and watch all applications
```bash
npm -w packages/esbuild-plugin-copy-files/ run build
npm -w packages/app/ run watch
```

### Start servers
```bash
npm -w packages/app/ run serve
# Start streaming server on port 8080
# Start api server on port 9080
# Start comment page server on port 8888 (http://localhost:8888/login)
```

### Start desktop application
```bash
npm -w packages/app/ run start-desktop
# And change Server URL to the streaming server (ws://localhost:8080/app) in its settings.
```

### License

This repository is under [MIT license](https://opensource.org/licenses/MIT).

Images (whale) are designed by [TADAira](https://www.sasagawa-brand.co.jp/tada/detail.php?id=1145&cid=4&cid2=14), change of live-comment.
