import { CSSProperties, PropsWithChildren, useMemo } from 'react'
import dompurify from 'dompurify'

export type WatermarkProps = {
  html: string
  opacity: number
  color: string
  fontSize: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  offset: string
  noComments: boolean
}

function calcCssProperties(props: WatermarkProps): CSSProperties {
  const cssProps: CSSProperties = {
    position: 'absolute',
    color: props.color,
    fontSize: props.fontSize,
    opacity: props.opacity,
    textShadow: 'none'
  }
  const offset = props.offset ?? '3%'
  switch (props.position) {
    case 'top-left':
      cssProps.top = offset
      cssProps.left = offset
      break
    case 'top-right':
      cssProps.top = offset
      cssProps.right = offset
      break
    case 'bottom-left':
      cssProps.bottom = offset
      cssProps.left = offset
      break
    case 'bottom-right':
    default:
      cssProps.bottom = offset
      cssProps.right = offset
      break

  }
  return cssProps
}

export function Watermark(props: PropsWithChildren<WatermarkProps>): JSX.Element {
  const style: CSSProperties = useMemo<CSSProperties>(
    (): CSSProperties => calcCssProperties(props),
    [props]
  )
  const __html = useMemo<string>((): string => dompurify.sanitize(props.html), [props.html])
  return (
    <div style={style} dangerouslySetInnerHTML={{ __html }} />
  )
}
