import React from 'react'
import { Message } from 'common'

type PropsType = {
  onSubmit: (message: Message) => void
}

type StateType = {
  comment: string
}

export class SendCommentForm extends React.Component<PropsType, StateType> {

  constructor(props: Readonly<PropsType>) {
    super(props)
    this.state = {
      comment: ''
    }
    this.onSubmit = this.onSubmit.bind(this)
    this.onChange = this.onChange.bind(this)
  }

  onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    const comment = this.state.comment
    if (comment) {
      this.props.onSubmit({ comment })
      this.setState({
        comment: ''
      })
    }
    e.preventDefault()
  }

  onChange(e: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({
      comment: e.target.value
    })
  }

  render(): React.ReactNode {
    return (
      <form onSubmit={this.onSubmit}>
        <input type="text" value={this.state.comment} onChange={this.onChange}></input>
        <input type="submit" value="💬"></input>
      </form>
    )
  }
}