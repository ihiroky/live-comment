import { sha512 } from 'js-sha512'

export function createHash(s: string): string {
  return sha512(s)
}

export function getRandomInteger(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
}

export function isObject(m: unknown): m is { [k: string]: unknown } {
  return typeof m === 'object' && m !== null
}

export function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit | undefined,
  timeoutMillis: number
): Promise<Response> {
  const abort = new AbortController()
  const timeout = window.setTimeout(() => abort.abort(), timeoutMillis)
  try {
    return fetch(input, init
      ? {
        ...init,
        signal: abort.signal
      }
      : {
        signal: abort.signal
      }
    )
  } finally {
    clearTimeout(timeout)
  }
}

export function createRandomString(columns: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const charactersLength = characters.length
  let result = ''
  for (let i = 0; i < columns; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

export function isMobiles(): boolean {
  if (!navigator || !navigator.userAgent) {
    throw new Error('No navigator.userAgent')
  }
  return /iPhone|iPad|Android/.test(navigator.userAgent)
}

export function isExtensionOrElectron(): boolean {
  return window.location.origin.startsWith('chrome-extension://') || window.location.origin.startsWith('file://')
}
