import React from 'react';
declare type PropsType = {
    onMessage: (message: string) => void;
};
declare type StateType = {
    connected: boolean;
    ws: WebSocket | null;
};
export declare class WebSocketClient extends React.Component<PropsType, StateType> {
    constructor(props: Readonly<PropsType>);
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): React.ReactNode;
}
export {};
