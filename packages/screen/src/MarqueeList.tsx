import React, { CSSProperties } from 'react'
import {
  MarqueeProps,
  MarqueePropsList,
} from './MarqueePropsGenerator'

type Props = {
  marquees: MarqueePropsList
  marqueeHeight: number
  duration: number
  color: string
  fontBorderColor: string
}

export const MarqueeList: React.FC<Props> = (props: React.PropsWithChildren<Props>): JSX.Element => {
  const style: CSSProperties = {
    color: props.color,
  }
  if (props.fontBorderColor) {
    style['WebkitTextStroke'] = `1px ${props.fontBorderColor}`
  }
  // Too large ?
  const offsetTop = props.marqueeHeight / 2

  return (
    <div className="message-list">{
      props.marquees.map((m: Readonly<MarqueeProps>): React.ReactNode =>
        <p
          className="message"
          key={m.key}
          ref={m.ref}
          style={{
            top: m.level * props.marqueeHeight + offsetTop,
            animationDuration: props.duration + 'ms',
            ...style,
          }}>
          {m.comment}
        </p>
      )
    }</div>
  )
}
