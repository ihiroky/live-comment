import React from 'react';
export declare type WebSocketClientPropsType = {
    onOpen?: (sender: (message: string) => void) => void;
    onMessage: (ev: MessageEvent) => void;
    url: string;
};
export declare class WebSocketClient extends React.Component<WebSocketClientPropsType> {
    private webSocket;
    constructor(props: Readonly<WebSocketClientPropsType>);
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): React.ReactNode;
    send(message: string): void;
}
