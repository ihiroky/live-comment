import React from 'react';
export interface Message {
    comment: string;
}
export declare type WebSocketClientPropsType = {
    onOpen?: (sender: (message: Message) => void) => void;
    onClose?: (ev: CloseEvent) => void;
    onError?: (ev: Event) => void;
    onMessage: (message: Message) => void;
    url: string;
};
export declare class WebSocketClient extends React.Component<WebSocketClientPropsType> {
    private webSocket;
    constructor(props: Readonly<WebSocketClientPropsType>);
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): React.ReactNode;
    send(message: Message): void;
}
