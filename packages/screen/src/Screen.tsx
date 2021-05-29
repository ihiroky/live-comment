import React from 'react'
import {
  CommentMessage,
  WebSocketClient
} from 'common'
import {
  MarqueePropsGenerator,
  MarqueePropsList
} from './MarqueePropsGenerator'
import { MarqueeList } from './MarqueeList'
import { CommandPalette } from './CommandPalette'
import { Watermark, WatermarkProps } from './Watermark'
import { WebSocketEventFacade } from './WebSocketEventFacade'

// TODO data flow should be server -> comment -> screen. A presentater may want to show comment list.

type ScreenProps = {
  url: string
  room: string
  hash: string
  duration: number
  watermark?: WatermarkProps
  onCommandExecuted: (command: string) => void
}

// TODO show comment history on the screen?

export const Screen: React.FC<ScreenProps> = (props: React.PropsWithChildren<ScreenProps>): JSX.Element => {

  const [marqueePropsList, setMarqueePropsList] = React.useState<MarqueePropsList>([])
  const marqueeGenerator = React.useMemo(
    () => new MarqueePropsGenerator(props.duration, (mpl: MarqueePropsList): void => { setMarqueePropsList(mpl) }),
    [props.duration]
  )
  const webSocketEventProxy = React.useMemo(
    () => new WebSocketEventFacade(props.room, props.hash, marqueeGenerator),
    [props.room, props.hash]
  )

  const [commandPaletteVisible, setCommandPaletteVisible] = React.useState<boolean>(false)

  // TODO Need to work with css class screen
  const marqueeHeight = 64

  function onCommandExecute(command: string): void {
    const comment: CommentMessage = {
      type: 'comment',
      comment: command
    }
    webSocketEventProxy.send(comment)
    setCommandPaletteVisible(false)
    props.onCommandExecuted(command)
  }

  return (
    <div className="screen" onMouseEnter={(): void => { setCommandPaletteVisible(true) }} onMouseLeave={ (): void => { setCommandPaletteVisible(false) }}>
      <MarqueeList
        marquees={marqueePropsList}
        marqueeHeight={marqueeHeight}
        duration={props.duration}
      />
      { commandPaletteVisible ? <CommandPalette onExecute={onCommandExecute} /> : <></> }
      { props.watermark ? <Watermark {...props.watermark} /> : <></> }
      <WebSocketClient
        url={props.url}
        noComments={props.watermark?.noComments}
        onOpen={webSocketEventProxy.onOpen}
        onClose={webSocketEventProxy.onClose}
        onError={webSocketEventProxy.onError}
        onMessage={webSocketEventProxy.onMessage}
      />
    </div>
  )
}
