import { Component, ChangeEvent, KeyboardEvent, ReactNode } from 'react'
import { CommentMessage } from '@/common/Message'
import { styled } from '@mui/system'

type PropsType = {
  onSubmit: (message: CommentMessage) => void
  sendWithCtrlEnter: boolean
  getControlModifierState?: () => boolean
}

type StateType = {
  comment: string
}

const FormInputText = styled('input')({
  border: 'none',
  padding: 6,
  margin: '10px 0px',
  borderRadius: 6,
  width: 'calc(99% - min(15%, 75px))',
})

const FormInputSubmit = styled('input')({
  width: '15%',
  maxWidth: 75,
  border: 'none',
  padding: '6px 3px',
  marginTop: 'auto',
  marginBottom: 10,
  marginLeft: 3,
  borderRadius: 6,
})

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
      <form action='javascript:void()' onSubmit={(e) => { e.preventDefault() }}>
        <FormInputText
          type="text"
          value={this.state.comment}
          onChange={this.onChange}
          onKeyDown={this.onKeyDown}
        />
        <FormInputSubmit
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
