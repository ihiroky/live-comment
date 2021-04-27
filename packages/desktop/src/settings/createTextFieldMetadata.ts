import { Field } from './hooks'

export type TextFieldMetadata<T> = {
  name: keyof T,
  label: string,
  rowsMax: number,
  validate: (value: string) => boolean,
  errorMessage: string
  field: Field
}

export function createTextFieldMetadata<T>(
  name: keyof T,
  field: Field,
  label: string,
  rowsMax: number,
  validate: (value: string) => boolean,
  errorMessage: string
): TextFieldMetadata<T> {
  return {
    name,
    label,
    rowsMax,
    validate,
    errorMessage,
    field
  }
}
