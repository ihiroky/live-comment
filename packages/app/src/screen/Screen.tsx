import { FC, PropsWithChildren, useState, useMemo, useEffect } from 'react'
import {
  MarqueePropsGenerator,
  MarqueePropsList
} from './MarqueePropsGenerator'
import { MarqueeList } from './MarqueeList'
import { Watermark, WatermarkProps } from './Watermark'
import { getLogger } from '@/common/Logger'
import { ReconnectableWebSocket } from '@/wscomp/rws'

type ScreenProps = {
  room: string
  hash: string
  duration: number
  color: string
  fontBorderColor: string
  watermark?: WatermarkProps
  rws: ReconnectableWebSocket | null
}

const log = getLogger('Screen')

// TODO Need to work with css class screen
const marqueeHeight = 64 + 8

const errorListener = (ev: Event): void => {
  log.error('[onError]', ev)
}

export const Screen: FC<ScreenProps> = (props: PropsWithChildren<ScreenProps>): JSX.Element => {

  const [marqueePropsList, setMarqueePropsList] = useState<MarqueePropsList>([])
  const { setRws, onOpen, onClose, onMessage } = useMemo((): MarqueePropsGenerator =>
    new MarqueePropsGenerator(props.room, props.hash, props.duration, (mpl: MarqueePropsList): void => {
      setMarqueePropsList(mpl)
    }), [props]
  )

  useEffect((): (() => void) => {
    if (!props.rws) {
      return () => undefined
    }

    const rws = props.rws
    setRws(rws)
    if (rws.readyState !== WebSocket.OPEN) {
      rws.addEventListener('open', onOpen)
    } else {
      setTimeout(onOpen, 0)
    }
    rws.addEventListener('close', e => onClose(e))
    rws.addEventListener('error', errorListener)
    rws.addEventListener('message', onMessage)

    return (): void => {
      rws.removeEventListener('message', onMessage)
      rws.removeEventListener('error', errorListener)
      rws.removeEventListener('close', onClose)
      rws.removeEventListener('open', onOpen)
    }
  }, [setRws, onOpen, onClose, onMessage, props.rws])

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
    </div>
  )
}
