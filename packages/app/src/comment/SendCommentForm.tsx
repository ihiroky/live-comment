import { Component, ChangeEvent, KeyboardEvent, ReactNode } from 'react'
import { CommentMessage } from '@/common/Message'

type PropsType = {
  onSubmit: (message: CommentMessage) => void
  sendWithCtrlEnter: boolean
  getControlModifierState?: () => boolean
}

type StateType = {
  comment: string
}

export class SendCommentForm extends Component<PropsType, StateType> {

  // For unit test with @testing-library/user-event v13.
  private getControlModifierState?: () => boolean

  constructor(props: Readonly<PropsType>) {
    super(props)
    this.state = {
      comment: '',
    }
    this.getControlModifierState = props.getControlModifierState ?? undefined
  }

  private send = (): void => {
    const comment = this.state.comment
    if (comment) {
      const type = 'comment'
      this.props.onSubmit({ type, comment })
      this.setState({
        comment: ''
      })
    }
  }

  private onChange = (e: ChangeEvent<HTMLInputElement>): void => {
    this.setState({
      comment: e.target.value
    })
  }

  private onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    const ctrlModifierState = !this.getControlModifierState
      ? e.getModifierState('Control')
      : this.getControlModifierState()
    switch (e.key) {
      case 'Enter':
        if (this.props.sendWithCtrlEnter && !ctrlModifierState) {
          return
        }
        this.send()
        break
    }
  }

  private onMouseUp = (): void => {
    this.send()
  }

  private onTouchEnd = (): void => {
    this.send()
  }

  render(): ReactNode {
    return (
      <form onSubmit={(e) => { e.preventDefault() }}>
        <input
          type="text"
          value={this.state.comment}
          onChange={this.onChange}
          onKeyDown={this.onKeyDown}
        />
        <input
          type="submit"
          autoComplete="off"
          value="💬"
          disabled={this.state.comment.length === 0}
          onMouseUp={this.onMouseUp}
          onTouchEnd={this.onTouchEnd}
        />
      </form>
    )
  }
}