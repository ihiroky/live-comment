export function assertNotNullable<T>(value: T, name: string): asserts value is NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(`Expected value (${name}) not to be nullable, but ${value}`)
  }
}
