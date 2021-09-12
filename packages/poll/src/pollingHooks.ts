import { AcnMessage, Deffered, getLogger, isAcnMessage, Message } from 'common'
import { WebSocketControl } from 'wscomp'
import React from 'react'
import { isPollMessage, PollEntry, PollFinishMessage, PollStartMessage, Progress, Update } from './types'

const log = getLogger('pollingHooks')

export function useAcnOk(pollId: number, title: string, wsc: WebSocketControl | null): Deffered<PollEntry[]> {
  return React.useMemo<Deffered<PollEntry[]>>(() => {
    const deffered = new Deffered<PollEntry[]>()
    deffered.promise.then((entries: PollEntry[]): void => {
      const start: PollStartMessage = {
        type: 'app',
        cmd: 'poll/start',
        id: 'poll-' + pollId,
        title,
        entries: entries.map(e => ({ key: e.key, description: e.description })),
      }
      log.info('Send', start)
      wsc?.send(start)
    })
    return deffered
  }, [pollId, title, wsc])
}

export function useOnMessage(
  acnOk: { resolve: (entries: PollEntry[]) => void },
  entries: PollEntry[],
  progress: Progress,
  onChange: (update: Update) => void
): (message: Message) => void {
  return React.useCallback((message: Message): void => {
    log.debug('[onMessage]', message)
    if (isAcnMessage(message)) {
      acnOk.resolve(entries)
      return
    }
    if (!isPollMessage(message)) {
      return
    }
    // choice = key of the chosen entry
    const p = progress
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
  }, [acnOk, entries, progress, onChange])
}

export function useOnOpen(
  wscRef: React.MutableRefObject<WebSocketControl | null>,
  room: string,
  hash: string
): (wsc: WebSocketControl) => void {
  return React.useCallback((wsc: WebSocketControl): void => {
    wscRef.current = wsc

    const acn: AcnMessage = {
      type: 'acn',
      room,
      hash,
    }
    wsc.send(acn)
  }, [wscRef, room, hash])
}

export function useOnClose(wsc: WebSocketControl | null): (ev: CloseEvent) => void {
  return React.useCallback((ev: CloseEvent): void => {
    log.info('[onClose]', ev.code, ev.reason)
    if (wsc) {
      wsc.reconnectWithBackoff()
    }
  }, [wsc])
}


export function useOnClick(
  progress: Progress | null,
  wsc: WebSocketControl | null,
  pollId: number,
  onFinished: () => void
): () => void {
  return React.useCallback((): void => {
    progress?.clear()
    if (wsc) {
      const finish: PollFinishMessage = {
        type: 'app',
        cmd: 'poll/finish',
        id:  'poll-' + pollId,
      }
      wsc.send(finish)
      wsc.close()
    }
    onFinished()
  }, [progress, wsc, pollId, onFinished])
}


export function useOnUnmount(
  progress: React.MutableRefObject<Progress>,
  wscRef: React.MutableRefObject<WebSocketControl | null>,
  pollIdRef: React.RefObject<number>
): void {
  React.useEffect((): (() => void) => {
    return (): void => {
      progress.current?.clear()
      if (wscRef.current) {
        const finish: PollFinishMessage = {
          type: 'app',
          cmd: 'poll/finish',
          id:  'poll-' + pollIdRef.current,
        }
        wscRef.current.send(finish)
        wscRef.current.close()
      }
    }
  }, [])
}
