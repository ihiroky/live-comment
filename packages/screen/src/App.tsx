import React from 'react'
import './App.css'
import { AppBase } from 'common'

// TODO show screen with Electron.
// TODO data flow should be server -> comment -> screen. A presentater may want to show comment list.

export default class App extends AppBase {

  componentDidMount(): void {
    super.componentDidMount()
  }

  componentWillUnmount(): void {
    super.componentWillUnmount()
  }

  render(): React.ReactNode {
    // TODO prepare for message storm (overlap with :nth-child)
    return (
      <div className="App">
        { super.render() }
      </div>
    );
  }
}
