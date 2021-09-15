export function getRandomInteger(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
}

export function isObject(m: unknown): m is { [k: string]: unknown } {
  return typeof m === 'object' && m !== null
}
