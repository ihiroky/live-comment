import React from 'react'
import './App.css'
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

type AppProps = {
  url: string
  room: string
  hash: string
  duration: number
  watermark?: WatermarkProps
}

export const App: React.FC<AppProps> = (props: React.PropsWithChildren<AppProps>): JSX.Element => {

  const [marqueePropsList, setMarqueePropsList] = React.useState<MarqueePropsList>([])
  // TODO useMemo
  const [marqueeGenerator] = React.useState<MarqueePropsGenerator>(() =>
    new MarqueePropsGenerator(props.room, props.hash, props.duration, (mpl: MarqueePropsList): void => {
      setMarqueePropsList(mpl)
    })
  )

  // TODO Need to work with css class .App
  const marqueeHeight = 64

  console.log('App.watermark', props.watermark)
  return (
    <div className="App">
      <MarqueeList
        marquees={marqueePropsList}
        marqueeHeight={marqueeHeight}
        duration={props.duration}
      />
      {
        props.watermark
          ? <Watermark {...props.watermark} />
          : <></>
      }
      <WebSocketClient
        url={props.url}
        noComments={props.watermark?.noComments === 'true'}
        onOpen={marqueeGenerator.onOpen}
        onClose={marqueeGenerator.onClose}
        onMessage={marqueeGenerator.onMessage}
      />
    </div>
  )
}
