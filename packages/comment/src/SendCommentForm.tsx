import React from 'react'
import { CommentMessage } from 'common'

type PropsType = {
  onSubmit: (message: CommentMessage) => void
  sendWithCtrlEnter: boolean
}

type StateType = {
  comment: string
}

export class SendCommentForm extends React.Component<PropsType, StateType> {

  private canSendMessage: boolean

  constructor(props: Readonly<PropsType>) {
    super(props)
    this.state = {
      comment: '',
    }
    this.canSendMessage = false
  }

  private onSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()

    if (this.props.sendWithCtrlEnter && !this.canSendMessage) {
      return
    }

    const comment = this.state.comment
    if (comment) {
      const type = 'comment'
      this.props.onSubmit({ type, comment })
      this.setState({
        comment: ''
      })
    }

    // For mouse and touch
    this.canSendMessage = false
  }

  private onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({
      comment: e.target.value
    })
  }

  private onKeyUp = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Control') {
      this.canSendMessage = false
    }
  }

  private onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Control') {
      this.canSendMessage = true
    }
  }

  private onMouseDown = (): void => {
    this.canSendMessage = true
  }

  private onTouchStart = (): void => {
    this.canSendMessage = true
  }

  render(): React.ReactNode {
    return (
      <form onSubmit={this.onSubmit}>
        <input
          type="text"
          value={this.state.comment}
          onChange={this.onChange}
          onKeyUp={this.onKeyUp}
          onKeyDown={this.onKeyDown}
        />
        <input
          type="submit"
          autoComplete="off"
          value="💬"
          onMouseDown={this.onMouseDown}
          onTouchStart={this.onTouchStart}
        />
      </form>
    )
  }
}