"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketClient = void 0;
const tslib_1 = require("tslib");
const react_1 = tslib_1.__importDefault(require("react"));
class WebSocketClient extends react_1.default.Component {
    constructor(props) {
        super(props);
        this.webSocket = null;
    }
    componentDidMount() {
        const webSocket = new WebSocket(this.props.url);
        webSocket.addEventListener('open', (ev) => {
            console.log('webSocket open', ev);
            if (this.props.onOpen) {
                this.props.onOpen(this.send.bind(this));
            }
        });
        webSocket.addEventListener('close', (ev) => {
            console.log('webSocket close', ev);
            if (this.props.onClose) {
                this.props.onClose(ev);
            }
            this.webSocket = null;
        });
        webSocket.addEventListener('error', (ev) => {
            console.log('webSocket error', ev);
            if (this.props.onError) {
                this.props.onError(ev);
            }
        });
        webSocket.addEventListener('message', (ev) => {
            const message = JSON.parse(ev.data);
            this.props.onMessage(message);
        });
        this.webSocket = webSocket;
    }
    componentWillUnmount() {
        if (this.webSocket) {
            this.webSocket.close();
            this.webSocket = null;
        }
    }
    render() {
        return react_1.default.createElement("div", null);
    }
    send(message) {
        if (this.webSocket) {
            const json = JSON.stringify(message);
            this.webSocket.send(json);
        }
    }
}
exports.WebSocketClient = WebSocketClient;
