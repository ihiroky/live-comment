"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketClient = void 0;
const tslib_1 = require("tslib");
const react_1 = tslib_1.__importDefault(require("react"));
class WebSocketClient extends react_1.default.Component {
    constructor(props) {
        super(props);
        this.state = {
            connected: false,
            ws: null
        };
    }
    componentDidMount() {
        const ws = new WebSocket('wss://localhost:8080/test');
        this.setState({
            connected: true,
            ws
        });
        const onMessage = this.props.onMessage;
        ws.addEventListener('open', function (ev) {
            console.log('open', ev);
        });
        ws.addEventListener('message', function (ev) {
            console.log('message', ev);
            onMessage(ev.data);
        });
        ws.addEventListener('close', function (ev) {
            console.log('close', ev);
        });
        ws.addEventListener('error', function (ev) {
            console.log('error', ev);
        });
    }
    componentWillUnmount() {
        const ws = this.state.ws;
        if (ws) {
            ws.close();
            this.setState({
                connected: false,
                ws: null
            });
        }
    }
    render() {
        const message = this.state.connected ? "connected." : "connecting...";
        return react_1.default.createElement("div", null, message);
    }
}
exports.WebSocketClient = WebSocketClient;
