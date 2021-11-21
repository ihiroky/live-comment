import { useRef } from 'react'
import {
  Grid,
  Button,
} from '@mui/material'
import { getLogger } from '@/common/Logger'
import { getRandomInteger } from '@/common/utils'
import { WebSocketClient, WebSocketControl } from '@/wscomp/WebSocketClient'
import {
  Progress,
  Update,
  PollEntry,
} from './types'
import {
  useAcnOk,
  useOnClick,
  useOnClose,
  useOnMessage,
  useOnOpen,
  useOnUnmount,
} from './pollingHooks'

const log = getLogger('poll/Polling')

export function Polling({ url, room, hash, title, entries, onChange, onFinished }: {
  url: string
  room: string
  hash: string
  title: string
  entries: PollEntry[]
  onChange: (update: Update) => void
  onFinished: () => void
}): JSX.Element | null {
  log.info('Polling', entries)
  const wscRef = useRef<WebSocketControl | null>(null)
  const progressRef = useRef<Progress>(new Map())
  const pollIdRef = useRef<number>(getRandomInteger())
  const acnOk = useAcnOk(pollIdRef, title, wscRef)

  const onMessage = useOnMessage(acnOk, entries, progressRef, onChange)
  const onOpen = useOnOpen(wscRef, room, hash)
  const onClose = useOnClose(wscRef)
  const onClick = useOnClick(progressRef, wscRef, pollIdRef, onFinished)
  useOnUnmount(progressRef, wscRef, pollIdRef)

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
        onClose={onClose}
        onError={(ev): void => log.debug('[Polling] websocket onError', ev)}
      />
    </>
  )
}
