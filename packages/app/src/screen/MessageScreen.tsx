import { FC, PropsWithChildren, useState, useMemo, useEffect, ComponentProps } from 'react'
import { MarqueeList } from './MarqueeList'
import { Watermark, WatermarkProps } from './Watermark'
import { MarqueePropsList, MarqueePropsGenerator } from './MarqueePropsGenerator'
import { Message } from '@/common/Message'
import { ScreenCSS } from './ScreenCSS'

type ScreenProps = {
  duration: number
  color: string
  fontBorderColor: string
  watermark?: WatermarkProps
  messageSource: {
    subscribe: (listener: (m: Message) => void) => void
    unsubscribe: (listener: (m: Message) => void) => void
  }
}

// TODO Need to work with css class screen
const marqueeHeight = 64 + 8

export type PublishableMessageSource =
  ComponentProps<typeof MessageScreen>['messageSource'] &
  { publish: (m: Message) => void }

export function createMessageSource(): PublishableMessageSource {
  const messageSource = {
    _listeners: new Array<(m: Message) => void>(),
    subscribe: (listener: (m: Message) => void): void => {
      messageSource._listeners.push(listener)
    },
    unsubscribe: (listener: (m: Message) => void): void => {
      const i = messageSource._listeners.indexOf(listener)
      if (i > -1) {
        messageSource._listeners.splice(i, 1)
      }
    },
    publish: (m: Message): void => {
      messageSource._listeners.forEach(f => f(m))
    }
  }
  return messageSource
}

export const MessageScreen: FC<ScreenProps> = (props: PropsWithChildren<ScreenProps>): JSX.Element => {

  const [marqueePropsList, setMarqueePropsList] = useState<MarqueePropsList>([])
  const { onMessage } = useMemo((): MarqueePropsGenerator =>
    new MarqueePropsGenerator(props.duration, (mpl: MarqueePropsList): void => {
      setMarqueePropsList(mpl)
    }), [props]
  )

  useEffect((): (() => void) => {
    props.messageSource.subscribe(onMessage)
    return (): void => {
      props.messageSource.unsubscribe(onMessage)
    }
  }, [props.messageSource, onMessage])

  return (
    <>
      <ScreenCSS />
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
    </>
  )
}
