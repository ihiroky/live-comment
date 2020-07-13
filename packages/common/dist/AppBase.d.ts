import React from 'react';
export declare type AppBasePropsType = {
    messageDuration: number;
    maxMessageCount: number;
    url: string;
    autoScroll?: boolean;
};
declare type AppBaseStateType = {
    messages: {
        key: number;
        data: string;
    }[];
};
export declare class AppBase extends React.Component<AppBasePropsType, AppBaseStateType> {
    private webSocket;
    private ref;
    private messageListDiv;
    private static readonly MARQUEE_DURATION_MILLIS;
    constructor(props: Readonly<AppBasePropsType>);
    componentDidMount(): void;
    private onMessage;
    private updateMessageList;
    private insertMessage;
    componentWillUnmount(): void;
    render(): React.ReactNode;
    send(message: string): void;
}
export {};
