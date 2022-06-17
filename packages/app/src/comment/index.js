"use strict";
exports.__esModule = true;
var react_1 = require("react");
var client_1 = require("react-dom/client");
var react_router_dom_1 = require("react-router-dom");
var App_1 = require("./App");
var LoginForm_1 = require("./LoginForm");
var serviceWorker = require("./serviceWorker");
var SoundPlayer_1 = require("./sound/SoundPlayer");
var Logger_1 = require("@/common/Logger");
var wsUrl = process.env.NODE_ENV === 'production'
    ? "wss://" + window.location.hostname + "/app"
    : "ws://localhost:8080";
var apiUrl = process.env.NODE_ENV === 'production'
    ? "https://" + window.location.hostname + "/api"
    : "http://localhost:9080";
if (process.env.NODE_ENV !== 'production') {
    (0, Logger_1.setDefaultLogLevel)(Logger_1.LogLevels.DEBUG);
}
if (navigator.cookieEnabled) {
    document.cookie = 'room=; max-age=0; Secure';
    document.cookie = 'password=; max-age=0; Secure';
    document.cookie = 'autoScroll=; max-age=0; Secure';
    document.cookie = 'sendWithCtrlEnter=; max-age=0; Secure';
    document.cookie = 'openSoundPanel=; max-age=0; Secure';
}
// Too rich to render SoundPlayer here, should be independent?
var rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element not found');
}
var root = (0, client_1.createRoot)(rootElement);
root.render(<react_1.StrictMode>
    <react_router_dom_1.BrowserRouter>
      <react_router_dom_1.Routes>
        <react_router_dom_1.Route path="/" element={<LoginForm_1.LoginForm apiUrl={apiUrl}/>}/>
        <react_router_dom_1.Route path="/login" element={<LoginForm_1.LoginForm apiUrl={apiUrl}/>}/>
        <react_router_dom_1.Route path="/comment" element={<App_1.App url={wsUrl} maxMessageCount={1024}/>}/>
        <react_router_dom_1.Route path="/sound" element={<SoundPlayer_1.SoundPlayer url={apiUrl}/>}/>
      </react_router_dom_1.Routes>
    </react_router_dom_1.BrowserRouter>
  </react_1.StrictMode>);
// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
