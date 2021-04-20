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

// TODO data flow should be server -> comment -> screen. A presentater may want to show comment list.

type AppProps = {
  url: string
  room: string
  hash: string
  duration: number
}

export const App: React.FC<AppProps> = (props: React.PropsWithChildren<AppProps>): JSX.Element => {

  const [marqueePropsList, setMarqueePropsList] = React.useState<MarqueePropsList>([])
  const [marqueeGenerator] = React.useState<MarqueePropsGenerator>(() =>
    new MarqueePropsGenerator(props.room, props.hash, props.duration, (mpl: MarqueePropsList): void => {
      setMarqueePropsList(mpl)
    })
  )

  // TODO Need to work with css class .App
  const marqueeHeight = 64

  return (
    <div className="App">
      <MarqueeList
        marquees={marqueePropsList}
        marqueeHeight={marqueeHeight}
        duration={props.duration}
      />
      <WebSocketClient
        url={props.url}
        onOpen={marqueeGenerator.onOpen}
        onClose={marqueeGenerator.onClose}
        onMessage={marqueeGenerator.onMessage}
      />
    </div>
  )
}
