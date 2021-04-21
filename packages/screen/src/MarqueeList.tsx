import React from 'react'
import {
  MarqueeProps,
  MarqueePropsList,
} from './MarqueePropsGenerator'

type Props = {
  marquees: MarqueePropsList
  marqueeHeight: number
  duration: number
}

export const MarqueeList: React.FC<Props> = (props: React.PropsWithChildren<Props>): JSX.Element => {
  return (
    <div className="message-list">{
      props.marquees.map((m: Readonly<MarqueeProps>): React.ReactNode =>
        <p
          className="message"
          key={m.key}
          ref={m.ref}
          style={{
            top: m.level * props.marqueeHeight,
            animationDuration: props.duration + 'ms'
          }}>
          {m.comment}
        </p>
      )
    }</div>
  )
}
