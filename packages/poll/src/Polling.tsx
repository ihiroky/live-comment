import React from 'react'
import {
  Grid,
  Button,
} from '@material-ui/core'
import {
  Message,
  WebSocketClient,
  WebSocketControl,
  isApplicationMessage,
  getLogger,
  AcnMessage,
} from 'common'
import {
  Mode,
  Progress,
  Update,
  PollEntry,
  PollFinishMessage,
  PollMessage,
  PollStartMessage,
} from './types'
import { getRandomInteger } from './utils'


function isPollMessage(m: Message): m is PollMessage {
  return isApplicationMessage(m) && m.cmd === 'poll/poll'
}

const log = getLogger('poll/Polling')

export function Polling({ mode, url, room, hash, title, entries, onChange, onFinished }: {
  mode: Mode
  url: string
  room: string
  hash: string
  title: string
  entries: PollEntry[]
  onChange: (update: Update) => void
  onFinished: () => void
}): JSX.Element | null {
  log.info('Polling', entries)
  const wscRef = React.useRef<WebSocketControl | null>(null)
  const progress = React.useRef<Progress>(new Map())
  const pollId = React.useMemo(() => getRandomInteger(), [])

  const onMessage = React.useCallback((message: Message): void => {
    log.debug('[onMessage]', message)
    if (!isPollMessage(message)) {
      return
    }
    // choice = key of the chosen entry
    const p = progress.current
    const oldChoice = p.get(message.cid)
    if (message.choice === oldChoice) {
      return
    }
    p.set(message.cid, message.choice)
    const change = new Map<PollEntry['key'], number>()
    change.set(message.choice, 1)
    if (oldChoice) {
      change.set(oldChoice, -1)
    }
    onChange(change)
  }, [onChange])

  const onOpen = React.useCallback((wsc: WebSocketControl): void => {
    wscRef.current = wsc
    const acn: AcnMessage = {
      type: 'acn',
      room,
      hash,
    }
    wsc.send(acn)
    const start: PollStartMessage = {
      type: 'app',
      cmd: 'poll/start',
      id: 'poll-' + pollId,
      title,
      entries: entries.map(e => ({ key: e.key, description: e.description })),
    }
    log.info('Send', start)
    wsc.send(start)

  }, [wscRef, entries])

  const onClick = React.useCallback((): void => {
    progress.current?.clear()
    if (wscRef.current) {
      const finish: PollFinishMessage = {
        type: 'app',
        cmd: 'poll/finish',
        id:  'poll-' + pollId,
      }
      wscRef.current.send(finish)
      wscRef.current.close()
    }
    onFinished()
  }, [onFinished])

  React.useEffect((): (() => void) => {
    return (): void => {
      progress.current?.clear()
      if (wscRef.current) {
        const finish: PollFinishMessage = {
          type: 'app',
          cmd: 'poll/finish',
          id:  'poll-' + pollId,
        }
        wscRef.current.send(finish)
        wscRef.current.close()
      }
    }
  }, [])

  if (mode !== 'poll') {
    return null
  }
  return (
    <>
      <Grid item xs={10} />
      <Grid item xs={2}>
        <Button variant="outlined" onClick={onClick}>Finish</Button>
      </Grid>
      <WebSocketClient
        url={url}
        onOpen={onOpen}
        onMessage={onMessage}
        onClose={(ev) => log.debug('[Polling] websocket onClose', ev)}
        onError={(ev) => log.debug('[Polling] websocket onError', ev)}
      />
    </>
  )
}
