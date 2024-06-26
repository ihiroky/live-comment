/* eslint-disable @typescript-eslint/no-namespace */
declare module 'unzip' {
  export namespace Zlib {
    export class Unzip {
      constructor(data: Array<number> | Uint8Array, options?: { utf8: boolean })
      getFilenames(): Array<string>
      decompress(fileName: string): Uint8Array
      setPassword(password: Array<number>|Uint8Array): void
      getFileHeaderAttribute(fileName: string, attrName: string): number
    }
  }
}
