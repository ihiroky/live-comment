import { AcnMessage, isAcnOkMessage, Message } from '@/common/Message'
import { Deffered } from '@/common/Deffered'
import { getLogger } from '@/common/Logger'
import { WebSocketControl } from '@/wscomp/WebSocketClient'
import { MutableRefObject, RefObject, useCallback, useEffect, useMemo } from 'react'
import { isPollMessage, PollEntry, PollFinishMessage, PollStartMessage, Progress, Update } from './types'

const log = getLogger('pollingHooks')

export function useAcnOk(
  pollIdRef: MutableRefObject<number>, title: string, wscRef: MutableRefObject<WebSocketControl | null>
): Deffered<PollEntry[]> {
  return useMemo<Deffered<PollEntry[]>>(() => {
    const deffered = new Deffered<PollEntry[]>()
    deffered.promise.then((entries: PollEntry[]): void => {
      const start: PollStartMessage = {
        type: 'app',
        cmd: 'poll/start',
        id: 'poll-' + pollIdRef.current,
        title,
        entries: entries.map(e => ({ key: e.key, description: e.description })),
      }
      log.debug('Send', wscRef.current !== null, start)
      wscRef.current?.send(start)
    })
    return deffered
  }, [pollIdRef, title, wscRef])
}

export function useOnMessage(
  acnOk: { resolve: (entries: PollEntry[]) => void },
  entries: PollEntry[],
  progressRef: MutableRefObject<Progress>,
  onChange: (update: Update) => void
): (message: Message) => void {
  return useCallback((message: Message): void => {
    log.debug('[onMessage]', message)
    if (isAcnOkMessage(message)) {
      acnOk.resolve(entries)
      return
    }
    if (!isPollMessage(message)) {
      return
    }
    // choice = key of the chosen entry
    const p = progressRef.current
    const oldChoice = p.get(message.from)
    if (message.choice === oldChoice) {
      return
    }
    p.set(message.from, message.choice)
    const change = new Map<PollEntry['key'], number>()
    change.set(message.choice, 1)
    if (oldChoice) {
      change.set(oldChoice, -1)
    }
    onChange(change)
  }, [acnOk, entries, progressRef, onChange])
}

export function useOnOpen(
  wscRef: MutableRefObject<WebSocketControl | null>,
  room: string,
  hash: string
): (wsc: WebSocketControl) => void {
  return useCallback((wsc: WebSocketControl): void => {
    wscRef.current = wsc

    const acn: AcnMessage = {
      type: 'acn',
      room,
      hash,
    }
    wsc.send(acn)
  }, [wscRef, room, hash])
}

export function useOnClose(wscRef: MutableRefObject<WebSocketControl | null>): (ev: CloseEvent) => void {
  return useCallback((ev: CloseEvent): void => {
    log.info('[onClose]', ev.code, ev.reason)
    wscRef.current?.reconnectWithBackoff()
  }, [wscRef])
}


export function useOnClick(
  progressRef: MutableRefObject<Progress>,
  wscRef: MutableRefObject<WebSocketControl | null>,
  pollIdRef: MutableRefObject<number>,
  onFinished: () => void
): () => void {
  return useCallback((): void => {
    progressRef.current.clear()
    if (wscRef.current) {
      const finish: PollFinishMessage = {
        type: 'app',
        cmd: 'poll/finish',
        id:  'poll-' + pollIdRef.current,
      }
      wscRef.current.send(finish)
      wscRef.current.close()
      wscRef.current = null
    }
    onFinished()
  }, [progressRef, wscRef, pollIdRef, onFinished])
}


export function useOnUnmount(
  progress: MutableRefObject<Progress>,
  wscRef: MutableRefObject<WebSocketControl | null>,
  pollIdRef: RefObject<number>
): void {
  useEffect((): (() => void) => {
    return (): void => {
      // progress is not a react node
      // eslint-disable-next-line react-hooks/exhaustive-deps
      progress.current.clear()
      if (wscRef.current) {
        const finish: PollFinishMessage = {
          type: 'app',
          cmd: 'poll/finish',
          // pollIdRef is not a react node
          // eslint-disable-next-line react-hooks/exhaustive-deps
          id:  'poll-' + pollIdRef.current,
        }
        wscRef.current.send(finish)
        // wscRef is not a react node
        // eslint-disable-next-line react-hooks/exhaustive-deps
        wscRef.current.close()
      }
    }
  }, [pollIdRef, progress, wscRef])
}
