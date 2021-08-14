export class Deffered<T> {
  private promise_: Promise<T>
  private resolve_: ((value: T) => void) | null
  private reject_: ((reason: unknown) => void) | null

  constructor() {
    this.resolve_ = null
    this.reject_ = null
    this.promise_ = new Promise<T>((resolve: (value: T) => void, reject: (reason: unknown) => void): void => {
      this.resolve_ = resolve
      this.reject_ = reject
    })
  }

  get promise(): Promise<T> {
    return this.promise_
  }

  resolve(value: T): void {
    if (this.resolve_ === null) {
      throw new Error('Internal promise is not initialized yet.')
    }
    this.resolve_(value)
  }

  reject(reason: unknown): void {
    if (this.reject_ === null)  {
      throw new Error('Internal promise is not initialized yet.')
    }
    this.reject_(reason)
  }
}
