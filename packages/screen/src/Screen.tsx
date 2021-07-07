import React from 'react'
import {
  WebSocketClient
} from 'common'
import {
  MarqueePropsGenerator,
  MarqueePropsList
} from './MarqueePropsGenerator'
import { MarqueeList } from './MarqueeList'
import { Watermark, WatermarkProps } from './Watermark'

// TODO data flow should be server -> comment -> screen. A presentater may want to show comment list.

type ScreenProps = {
  url: string
  room: string
  hash: string
  duration: number
  color: string
  fontBorderColor: string
  watermark?: WatermarkProps
}

export const Screen: React.FC<ScreenProps> = (props: React.PropsWithChildren<ScreenProps>): JSX.Element => {

  const [marqueePropsList, setMarqueePropsList] = React.useState<MarqueePropsList>([])
  const marqueeGenerator = React.useMemo((): MarqueePropsGenerator =>
    new MarqueePropsGenerator(props.room, props.hash, props.duration, (mpl: MarqueePropsList): void => {
      setMarqueePropsList(mpl)
    }),
    [props]
  )

  // TODO Need to work with css class screen
  const marqueeHeight = 64

  return (
    <div className="screen">
      <MarqueeList
        marquees={marqueePropsList}
        marqueeHeight={marqueeHeight}
        duration={props.duration}
        color={props.color}
        fontBorderColor={props.fontBorderColor}
      />
      {
        props.watermark
          ? <Watermark {...props.watermark} />
          : <></>
      }
      <WebSocketClient
        url={props.url}
        noComments={props.watermark?.noComments}
        onOpen={marqueeGenerator.onOpen}
        onClose={marqueeGenerator.onClose}
        onMessage={marqueeGenerator.onMessage}
      />
    </div>
  )
}
