export type Entry = {
  key: number
  description: string
  count: number
}

export type Mode =
  | 'edit'
  | 'poll'
  | 'result-list'
  | 'result-graph'
