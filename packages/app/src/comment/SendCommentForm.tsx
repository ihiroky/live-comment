import { Component, ChangeEvent, KeyboardEvent, ReactNode } from 'react'
import { CommentMessage } from '@/common/Message'
import { styled } from '@mui/system'
import SendRoundedIcon from '@mui/icons-material/SendRounded'

type PropsType = {
  onSubmit: (message: CommentMessage) => void
  sendWithCtrlEnter: boolean
  getControlModifierState?: () => boolean
}

type StateType = {
  comment: string
}

const FormInputText = styled('input')({
  width: '100%',
  height: 42,
  background: 'rgba(255, 255, 255, 0.62)',
  border: '1px solid rgba(32, 168, 109, 0.32)',
  color: '#15382c',
  fontSize: 15,
  outline: 'none',
  padding: '0 52px 0 14px',
  borderRadius: 999,
  transition: 'background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
  '&:focus': {
    background: 'rgba(255, 255, 255, 0.86)',
    borderColor: 'rgba(32, 168, 109, 0.64)',
    boxShadow: '0 0 0 2px rgba(32, 168, 109, 0.1)',
  },
})

const FormInputSubmit = styled('button')({
  position: 'absolute',
  top: 4,
  right: 4,
  width: 42,
  height: 34,
  border: 'none',
  borderRadius: 999,
  background: 'rgba(32, 168, 109, 0.12)',
  color: '#127c51',
  cursor: 'pointer',
  transition: 'background-color 120ms ease, color 120ms ease',
  '&:hover:not(:disabled)': {
    background: 'rgba(32, 168, 109, 0.18)',
  },
  '&:active:not(:disabled)': {
    background: 'rgba(32, 168, 109, 0.24)',
  },
  '&:disabled': {
    background: 'transparent',
    color: 'rgba(21, 56, 44, 0.28)',
    cursor: 'default',
  },
})

const FloatingForm = styled('form')({
  margin: '12px 0 8px',
})

const InputField = styled('div')({
  position: 'relative',
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
    // Do not send while IME composition is active; Enter may only confirm conversion.
    if (e.nativeEvent.isComposing) {
      return
    }

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
      <FloatingForm onSubmit={(e) => { e.preventDefault() }}>
        <InputField>
          <FormInputText
            type="text"
            value={this.state.comment}
            onChange={this.onChange}
            onKeyDown={this.onKeyDown}
          />
          <FormInputSubmit
            type="submit"
            aria-label="Send comment"
            disabled={this.state.comment.length === 0}
            onMouseUp={this.onMouseUp}
            onTouchEnd={this.onTouchEnd}
          >
            <SendRoundedIcon fontSize="small" />
          </FormInputSubmit>
        </InputField>
      </FloatingForm>
    )
  }
}
