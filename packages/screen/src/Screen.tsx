import { FC, PropsWithChildren, useState, useMemo, useCallback } from 'react'
import { WebSocketClient } from 'wscomp'
import {
  MarqueePropsGenerator,
  MarqueePropsList
} from './MarqueePropsGenerator'
import { MarqueeList } from './MarqueeList'
import { Watermark, WatermarkProps } from './Watermark'
import { getLogger } from 'common'

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

const log = getLogger('Screen')

export const Screen: FC<ScreenProps> = (props: PropsWithChildren<ScreenProps>): JSX.Element => {

  const [marqueePropsList, setMarqueePropsList] = useState<MarqueePropsList>([])
  const marqueeGenerator = useMemo((): MarqueePropsGenerator =>
    new MarqueePropsGenerator(props.room, props.hash, props.duration, (mpl: MarqueePropsList): void => {
      setMarqueePropsList(mpl)
    }), [props]
  )
  const onError = useCallback((e: Event): void => {
    log.error('[onError]', e)
  }, [])

  // TODO Need to work with css class screen
  const marqueeHeight = 64 + 8

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
        onError={onError}
        onMessage={marqueeGenerator.onMessage}
      />
    </div>
  )
}
