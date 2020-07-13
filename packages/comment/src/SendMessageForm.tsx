import React from 'react'

type PropsType = {
  onSubmit: (message: string) => void
}

type StateType = {
  message: string
}

export class SendMessageForm extends React.Component<PropsType, StateType> {

  constructor(props: Readonly<PropsType>) {
    super(props)
    this.state = {
      message: ""
    }
    this.onSubmit = this.onSubmit.bind(this)
    this.onChange = this.onChange.bind(this)
  }

  onSubmit(e: React.FormEvent<HTMLFormElement>): void {
    const message = this.state.message
    if (message) {
      this.props.onSubmit(message)
      this.setState({
        message: ""
      })
    }
    e.preventDefault()
  }

  onChange(e: React.ChangeEvent<HTMLInputElement>): void {
    this.setState({
      message: e.target.value
    })
  }

  render(): React.ReactNode {
    return (
      <form onSubmit={this.onSubmit}>
        <input type="text" value={this.state.message} onChange={this.onChange}></input>
        <input type="submit" value="💬"></input>
      </form>
    )
  }
}