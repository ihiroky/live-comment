import { Value } from './types'

export type TextFieldMetadata<T, V> = {
  name: keyof T
  label: string
  maxRows: number
  validate: (value: string) => boolean
  errorMessage: string
  value: Value<V>
}

export function createTextFieldMetadata<T, V>(
  name: keyof T,
  value: Value<V>,
  label: string,
  rowsMax: number,
  validate: (value: string) => boolean,
  errorMessage: string
): TextFieldMetadata<T, V> {
  return {
    name,
    label,
    maxRows: rowsMax,
    validate,
    errorMessage,
    value
  }
}
