import React from 'react'
import './App.css'
import { AppBase, AppBasePropsType } from 'common'
import { SendMessageForm } from './SendMessageForm'

export default class App extends AppBase {

  constructor(props: Readonly<AppBasePropsType>) {
    super(props)
    this.onSubmit = this.onSubmit.bind(this)
  }

  onSubmit(message: string): void {
    this.send(message)
  }

  componentDidMount(): void {
    super.componentDidMount()
  }

  componentWillUnmount(): void {
    super.componentWillUnmount()
  }

  render(): React.ReactNode {
    return (
      <div className="App">
        <div className="box">
          { super.render() }
          <SendMessageForm onSubmit={this.onSubmit}></SendMessageForm>
        </div>
      </div>
    )
  }
}

