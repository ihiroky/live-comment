import { AcnMessage, isAcnOkMessage, Message } from '@/common/Message'
import { Deffered } from '@/common/Deffered'
import { getLogger } from '@/common/Logger'
import { MutableRefObject, RefObject, useCallback, useEffect, useMemo } from 'react'
import { isPollMessage, PollEntry, PollFinishMessage, PollStartMessage, Progress, Update } from './types'
import { ReconnectableWebSocket } from '@/wscomp/rws'

const log = getLogger('pollingHooks')

export function useAcnOk(
  pollIdRef: MutableRefObject<number>, title: string, rws: ReconnectableWebSocket | null,
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
      log.debug('Send', rws !== null, start)
      rws?.send(start)
    })
    return deffered
  }, [pollIdRef, title, rws])
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
  rws: ReconnectableWebSocket | null,
  room: string,
  hash: string
): () => void {
  return useCallback((): void => {
    const acn: AcnMessage = {
      type: 'acn',
      room,
      hash,
    }
    rws?.send(acn)
  }, [rws, room, hash])
}

export function useOnClose(rws: ReconnectableWebSocket | null): (ev: CloseEvent) => void {
  return useCallback((ev: CloseEvent): void => {
    log.info('[onClose]', ev.code, ev.reason)
    rws?.reconnectWithBackoff()
  }, [rws])
}


export function useOnClick(
  progressRef: MutableRefObject<Progress>,
  rws: ReconnectableWebSocket | null,
  pollIdRef: MutableRefObject<number>,
  onFinished: () => void
): () => void {
  return useCallback((): void => {
    progressRef.current.clear()
    if (rws) {
      const finish: PollFinishMessage = {
        type: 'app',
        cmd: 'poll/finish',
        id:  'poll-' + pollIdRef.current,
      }
      rws.send(finish)
      rws.close()
    }
    onFinished()
  }, [progressRef, rws, pollIdRef, onFinished])
}


export function useOnUnmount(
  progress: MutableRefObject<Progress>,
  rws: ReconnectableWebSocket | null,
  pollIdRef: RefObject<number>
): void {
  useEffect((): (() => void) => {
    return (): void => {
      // progress is not a react node
      // eslint-disable-next-line react-hooks/exhaustive-deps
      progress.current.clear()
      if (rws) {
        const finish: PollFinishMessage = {
          type: 'app',
          cmd: 'poll/finish',
          // pollIdRef is not a react node
          // eslint-disable-next-line react-hooks/exhaustive-deps
          id:  'poll-' + pollIdRef.current,
        }
        rws.send(finish)
        // wscRef is not a react node
        // eslint-disable-next-line react-hooks/exhaustive-deps
        rws.close()
      }
    }
  }, [pollIdRef, progress, rws])
}
