import React from 'react'

type Props = {
  id: string
}

export class TextWidthCalculator extends React.Component<Props> {

  static calculateWidth(text: string, id: string): number {
    const canvas = document.getElementById(id) as HTMLCanvasElement
    if (!canvas || !canvas.getContext) {
      return -1
    }
    const context = canvas.getContext('2d')
    if (!context) {
      return -1
    }
    context.font = '45px "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif'
    const metrics = context.measureText(text)
    return metrics.width

  }

  render(): React.ReactNode {
    return <canvas id={this.props.id} style={{display: 'none'}}></canvas>
  }
}