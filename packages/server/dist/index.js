"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const https_1 = tslib_1.__importDefault(require("https"));
const ws_1 = tslib_1.__importDefault(require("ws"));
require("tslib");
const server = https_1.default.createServer({
    cert: fs_1.default.readFileSync('dist/cert.pem'),
    key: fs_1.default.readFileSync('dist/key.pem')
}).on('request', (_, res) => {
    res.end('Hello.');
});
const wss = new ws_1.default.Server({ server });
wss.on('connection', function (ws) {
    ws.on('message', function (message) {
        console.log('message', message);
        // TODO add queue not to blocked by slow clients
        wss.clients.forEach(client => client.send(message));
    });
    ws.send('connection');
});
// TODO handle upgrade to authenticate client
// TODO detect stale connections
// TODO proxy
server.listen(8080);
