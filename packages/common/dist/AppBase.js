"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppBase = void 0;
const tslib_1 = require("tslib");
const react_1 = tslib_1.__importDefault(require("react"));
class AppBase extends react_1.default.Component {
    constructor(props) {
        super(props);
        this.state = {
            messages: []
        };
        this.webSocket = null;
        this.ref = react_1.default.createRef();
        this.messageListDiv = null;
    }
    componentDidMount() {
        const webSocket = new WebSocket(this.props.url);
        webSocket.addEventListener('open', (ev) => {
            console.log('webSocket open', ev);
        });
        webSocket.addEventListener('close', (ev) => {
            console.log('webSocket close', ev);
            this.webSocket = null;
        });
        webSocket.addEventListener('error', (ev) => {
            console.log('webSocket error', ev);
        });
        webSocket.addEventListener('message', this.onMessage.bind(this));
        this.webSocket = webSocket;
        this.messageListDiv = document.getElementsByClassName('message-list')[0];
    }
    onMessage(ev) {
        const key = Date.now();
        const data = ev.data;
        const messages = this.state.messages;
        if (this.updateMessageList(key, data)) {
            return;
        }
        this.insertMessage(key, data);
    }
    updateMessageList(key, data) {
        const messages = this.state.messages;
        for (const m of messages) {
            if (key - m.key > this.props.messageDuration) {
                m.key = key;
                m.data = data;
                this.setState({
                    messages
                });
                return true;
            }
        }
        return false;
    }
    insertMessage(key, data) {
        const messages = this.state.messages;
        if (messages.length === this.props.maxMessageCount) {
            messages.unshift();
        }
        messages.push({ key, data });
        this.setState({ messages });
        if (this.props.autoScroll && this.ref.current && this.messageListDiv) {
            this.messageListDiv.scrollTo(0, this.ref.current.offsetTop);
        }
    }
    componentWillUnmount() {
        if (this.webSocket) {
            this.webSocket.close();
            this.webSocket = null;
        }
    }
    render() {
        return (react_1.default.createElement("div", { className: "message-list" },
            this.state.messages.map(m => react_1.default.createElement("p", { key: m.key, className: "message" }, m.data)),
            react_1.default.createElement("div", { ref: this.ref })));
    }
    send(message) {
        if (this.webSocket) {
            this.webSocket.send(message);
        }
    }
}
exports.AppBase = AppBase;
AppBase.MARQUEE_DURATION_MILLIS = 5000;
