import { isObject, isMobiles, isExtensionOrElectron } from './utils'
import { test, expect } from '@jest/globals'

// https://blog.shibayu36.org/entry/2016/07/13/110000
export function stubUserAgent(userAgent: string) {
  // もともとのPropertyDescriptorを保存しておく
  const origDescriptor = Object.getOwnPropertyDescriptor(
    navigator, 'userAgent'
  )

  // navigatorのuserAgentプロパティを
  // 渡されたuserAgentが返るように書き換える
  Object.defineProperty(navigator, 'userAgent', {
    get: function () { return userAgent },
    enumerable: true,
    configurable: true,
  })

  // restoreを呼べるようなオブジェクトを返す
  return {
    restore() {
      if (origDescriptor) {
        // origDescriptorがあるなら、definePropertyで戻す
        Object.defineProperty(navigator, 'userAgent', origDescriptor)
      }
      else {
        // origDescriptorがないなら、navigatorのprototypeで
        // userAgentが定義されているはず。それならば、モックで
        // 定義したuserAgentプロパティをdeleteすれば戻せる。
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (navigator as any).userAgent
      }
    },
  }
}

export function stubLocationOrigin(origin: string) {
  const origDescriptor = Object.getOwnPropertyDescriptor(window, 'location')

  Object.defineProperty(window, 'location', {
    configurable: true,
    enumerable: true,
    value: { origin }
  })

  return {
    restore() {
      if (origDescriptor) {
        Object.defineProperty(window, 'location', origDescriptor)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as any).location
      }
    },
  }
}

test('null is not "Object"', () => {
  const actual = isObject(null)

  expect(actual).toBeFalsy()
})

test('{} is "Object"', () => {
  const actual = isObject({})

  expect(actual).toBeTruthy()
})

test('1 is not "Object"', () => {
  const actual = isObject(1)

  expect(actual).toBeFalsy()
})


test('isMobile() returns true for mobile user agent', () => {
  const ua = 'iPhone'
  const sua = stubUserAgent(ua)

  try {
    const actual = isMobiles()

    expect(actual).toBeTruthy()
  } finally {
    sua.restore()
  }
})

test('isMobile() returns false for desktop user agent', () => {
  const ua = 'Macintosh'
  const sua = stubUserAgent(ua)

  try {
    const actual = isMobiles()

    expect(actual).toBeFalsy()
  } finally {
    sua.restore()
  }
})

test('isExtensionOrElectron() returns true false browser', () => {
  const actual = isExtensionOrElectron()

  expect(actual).toBeFalsy()
})

test('isExtensionOrElectron() returns true for extension', () => {
  const origin = 'chrome-extension://'
  const slo = stubLocationOrigin(origin)

  try {
    const actual = isExtensionOrElectron()

    expect(actual).toBeTruthy()
  } finally {
    slo.restore()
  }
})

test('isExtensionOrElectron() returns true for electron', () => {
  const origin = 'file://'
  const slo = stubLocationOrigin(origin)

  try {
    const actual = isExtensionOrElectron()

    expect(actual).toBeTruthy()
  } finally {
    slo.restore()
  }
})
