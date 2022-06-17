import { useRef } from 'react'
import {
  Grid,
  Button,
} from '@mui/material'
import { getLogger } from '@/common/Logger'
import { getRandomInteger } from '@/common/utils'
import { ReconnectableWebSocket } from '@/wscomp/rws'
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
import { useEffect } from 'react'

const log = getLogger('poll/Polling')
const errorListener = (ev: Event): void => {
  log.debug('[Polling] ws error', ev)
}

export function Polling({ room, hash, title, entries, rws, onChange, onFinished }: {
  room: string
  hash: string
  title: string
  entries: PollEntry[]
  rws: ReconnectableWebSocket | null
  onChange: (update: Update) => void
  onFinished: () => void
}): JSX.Element | null {
  log.info('Polling', entries)
  const progressRef = useRef<Progress>(new Map())
  const pollIdRef = useRef<number>(getRandomInteger())
  const acnOk = useAcnOk(pollIdRef, title, rws)

  const onMessage = useOnMessage(acnOk, entries, progressRef, onChange)
  const onOpen = useOnOpen(rws, room, hash)
  const onClose = useOnClose(rws)
  const onClick = useOnClick(progressRef, rws, pollIdRef, onFinished)
  useOnUnmount(progressRef, rws, pollIdRef)

  useEffect((): (() => void) => {
    if (!rws) {
      return () => undefined
    }

    rws.addEventListener('open', onOpen)
    rws.addEventListener('close', onClose)
    rws.addEventListener('error', errorListener)
    rws.addEventListener('message', onMessage)

    return (): void => {
      rws.removeEventListener('message', onMessage)
      rws.removeEventListener('error', errorListener)
      rws.removeEventListener('close', onClose)
      rws.removeEventListener('open', onOpen)
    }
  }, [rws, onOpen, onClose, onMessage])

  return (
    <>
      <Grid item xs={10} />
      <Grid item xs={2}>
        <Button variant="outlined" onClick={onClick}>Finish</Button>
      </Grid>
    </>
  )
}
