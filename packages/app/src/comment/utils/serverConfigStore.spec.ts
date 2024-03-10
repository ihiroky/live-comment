import { jest, describe, test, expect } from '@jest/globals'
import { serverConfigStore } from './serverConfigStore'
import { fetchWithTimeout } from '@/common/utils'

jest.mock('@/common/utils')

describe('serverConfigStore', () => {
  test('update() calls callback except unsubscribed after update snapshot', async () => {
    jest.mocked(fetchWithTimeout).mockResolvedValue(
      { ok: true } as Response
    )

    const callback0 = jest.fn()
    const callback1 = jest.fn()
    const callback2 = jest.fn()
    serverConfigStore.subscribe(callback0)
    const unsubscribe1 = serverConfigStore.subscribe(callback1)
    serverConfigStore.subscribe(callback2)

    unsubscribe1()
    await serverConfigStore.update('http://example.com')

    expect(serverConfigStore.getSnapshot()).toEqual({ samlEnabled: true })
    expect(callback0).toHaveBeenCalled()
    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).toHaveBeenCalled()
  })

  test('samleElabled gets false if fetch failed', async () => {
    jest.mocked(fetchWithTimeout).mockRejectedValue(new Error('error'))

    const callback = jest.fn()
    serverConfigStore.subscribe(callback)
    serverConfigStore.snapshot.samlEnabled = true
    await serverConfigStore.update('http://example.com')

    expect(serverConfigStore.getSnapshot()).toEqual({ samlEnabled: false })
    expect(callback).toHaveBeenCalled()
  })
})
