import { renderHook } from '@testing-library/react-hooks'
import { useOnGeneralSettingsUpdate, useOnSubmit, useOnWatermarkSettingsUpdate, useSettingsState } from './hooks'
import { GeneralSettingsState, Settings, SettingsState, WatermarkSettingsState } from './types'

beforeEach(() => {
  window.settings = {
    requestSettings: jest.fn(),
    postSettings: jest.fn().mockImplementation(() => Promise.resolve()),
    getScreenPropsList: jest.fn(),
  }
  window.close = jest.fn()
})

test('useSettingsState initial value', async () => {
  window.settings.requestSettings = (): Promise<Settings> => {
    return Promise.resolve<Settings>({
      version: '1',
      general: {
        url: 'url',
        room: 'room',
        password: 'password',
        duration: 11,
        zoom: 200,
        screen: 1,
        fontColor: 'red',
        fontBorderColor: 'blue',
        gpu: true,
      },
      watermark: {
        html: '<div></div>',
        opacity: 1,
        color: 'green',
        fontSize: '96px',
        position: 'top-left',
        offset: '5%',
        noComments: true,
      },
    })
  }
  const { result, waitForNextUpdate } = renderHook(() => useSettingsState())

  expect(result.current.general).toEqual({
    url: { value: { data: '', error: false }, setValue: expect.any(Function) },
    room: { value: { data: '', error: false }, setValue: expect.any(Function),},
    password: { value: { data: '', error: false }, setValue: expect.any(Function) },
    duration: { value: { data: '9', error: false }, setValue: expect.any(Function) },
    zoom: { value: { data: '100', error: false }, setValue: expect.any(Function) },
    screen: { value: { data: 0, error: false }, setValue: expect.any(Function) },
    fontColor: { value: { data: '#111111', error: false }, setValue: expect.any(Function) },
    fontBorderColor: { value: { data: '#cccccc', error: false }, setValue: expect.any(Function) },
    gpu: { value: { data: false, error: false }, setValue: expect.any(Function) },
  })
  expect(result.current.watermark).toEqual({
    html: { value: { data: '', error: false }, setValue: expect.any(Function) },
    opacity: { value: { data: '0.7', error: false }, setValue: expect.any(Function) },
    color: { value: { data: 'black', error: false }, setValue: expect.any(Function) },
    fontSize: { value: { data: '64px', error: false }, setValue: expect.any(Function) },
    position: { value: { data: 'bottom-right', error: false }, setValue: expect.any(Function) },
    offset: { value: { data: '3%', error: false }, setValue: expect.any(Function) },
    noComments: { value: { data: false, error: false }, setValue: expect.any(Function) },
  })

  await waitForNextUpdate()

  expect(result.current.general).toEqual({
    url: { value: { data: 'url', error: false }, setValue: expect.any(Function) },
    room: { value: { data: 'room', error: false }, setValue: expect.any(Function),},
    password: { value: { data: 'password', error: false }, setValue: expect.any(Function) },
    duration: { value: { data: '11', error: false }, setValue: expect.any(Function) },
    zoom: { value: { data: '200', error: false }, setValue: expect.any(Function) },
    screen: { value: { data: 1, error: false }, setValue: expect.any(Function) },
    fontColor: { value: { data: 'red', error: false }, setValue: expect.any(Function) },
    fontBorderColor: { value: { data: 'blue', error: false }, setValue: expect.any(Function) },
    gpu: { value: { data: true, error: false }, setValue: expect.any(Function) },
  })
  expect(result.current.watermark).toEqual({
    html: { value: { data: '<div></div>', error: false }, setValue: expect.any(Function) },
    opacity: { value: { data: '1', error: false }, setValue: expect.any(Function) },
    color: { value: { data: 'green', error: false }, setValue: expect.any(Function) },
    fontSize: { value: { data: '96px', error: false }, setValue: expect.any(Function) },
    position: { value: { data: 'top-left', error: false }, setValue: expect.any(Function) },
    offset: { value: { data: '5%', error: false }, setValue: expect.any(Function) },
    noComments: { value: { data: true, error: false }, setValue: expect.any(Function) },
  })
})

function createGeneralSettings(): GeneralSettingsState {
  return {
    url: { value: { data: '', error: false}, setValue: jest.fn() },
    room: { value: { data: '', error: false}, setValue: jest.fn() },
    password: { value: { data: '', error: false}, setValue: jest.fn() },
    duration: { value: { data: '', error: false}, setValue: jest.fn() },
    zoom: { value: { data: '', error: false}, setValue: jest.fn() },
    screen: { value: { data: 0, error: false}, setValue: jest.fn() },
    fontColor: { value: { data: '', error: false}, setValue: jest.fn() },
    fontBorderColor: { value: { data: '', error: false}, setValue: jest.fn() },
    gpu: { value: { data: false, error: false}, setValue: jest.fn() }
  }
}

test('useOnGeneralSettingsUpdate string', () => {
  const g = createGeneralSettings()
  const { result } = renderHook(() => useOnGeneralSettingsUpdate(g))
  const onGeneralSettingsUpdate = result.current

  const keys: Array<keyof GeneralSettingsState> = [
    'url', 'room', 'password', 'duration', 'zoom', 'fontColor', 'fontBorderColor'
  ]
  keys.forEach(key => {
    const data = key + '0'
    onGeneralSettingsUpdate(key, data, true)
    expect(g[key].setValue).toBeCalledWith({ data: data, error: true })
  })
})

test('useOnGeneralSettingsUpdate boolean', () => {
  const g = createGeneralSettings()
  const { result } = renderHook(() => useOnGeneralSettingsUpdate(g))
  const onGeneralSettingsUpdate = result.current

  const keys: Array<keyof GeneralSettingsState> = ['gpu']
  keys.forEach(key => {
    onGeneralSettingsUpdate(key, 'true', true)
    expect(g[key].setValue).toBeCalledWith({ data: true, error: true })
  })
})

test('useOnGeneralSettingsUpdate number', () => {
  const g = createGeneralSettings()
  const { result } = renderHook(() => useOnGeneralSettingsUpdate(g))
  const onGeneralSettingsUpdate = result.current

  const keys: Array<keyof GeneralSettingsState> = ['screen']
  keys.forEach(key => {
    onGeneralSettingsUpdate(key, '1', true)
    expect(g[key].setValue).toBeCalledWith({ data: 1, error: true })
  })
})


function createWatermarkSettings(): WatermarkSettingsState {
  return {
    html: { value: { data: '', error: false}, setValue: jest.fn() },
    opacity: { value: { data: '', error: false}, setValue: jest.fn() },
    color: { value: { data: '', error: false}, setValue: jest.fn() },
    fontSize: { value: { data: '', error: false}, setValue: jest.fn() },
    position: { value: { data: 'bottom-right', error: false}, setValue: jest.fn() },
    offset: { value: { data: '', error: false}, setValue: jest.fn() },
    noComments: { value: { data: false, error: false}, setValue: jest.fn() },
  }
}

test('useOnWatermarkSettingsUpdate string', () => {
  const w = createWatermarkSettings()
  const { result } = renderHook(() => useOnWatermarkSettingsUpdate(w))
  const onWatermarkSettingsUpdate = result.current

  const keys: Array<keyof WatermarkSettingsState> = ['html', 'opacity', 'color', 'fontSize', 'offset']
  keys.forEach(key => {
    onWatermarkSettingsUpdate(key, '1', true)
    expect(w[key].setValue).toBeCalledWith({ data: '1', error: true })
  })
})

test('useOnWatermarkSettingsUpdate WatermarkPosition', () => {
  const w = createWatermarkSettings()
  const { result } = renderHook(() => useOnWatermarkSettingsUpdate(w))
  const onWatermarkSettingsUpdate = result.current

  const keys: Array<keyof WatermarkSettingsState> = ['position']
  keys.forEach(key => {
    onWatermarkSettingsUpdate(key, 'top-left', true)
    expect(w[key].setValue).toBeCalledWith({ data: 'top-left', error: true })
  })
})

test('useOnWatermarkSettingsUpdate boolean', () => {
  const w = createWatermarkSettings()
  const { result } = renderHook(() => useOnWatermarkSettingsUpdate(w))
  const onWatermarkSettingsUpdate = result.current

  const keys: Array<keyof WatermarkSettingsState> = ['noComments']
  keys.forEach(key => {
    onWatermarkSettingsUpdate(key, 'true', true)
    expect(w[key].setValue).toBeCalledWith({ data: true, error: true })
  })
})

test('useOnSubmit', async () => {
  const settingsState: SettingsState = {
    general: createGeneralSettings(),
    watermark: createWatermarkSettings(),
  }
  const { result } = renderHook(() => useOnSubmit(settingsState))
  const onSubmit = result.current
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await onSubmit({ preventDefault: jest.fn() } as any)

  const expected: Settings = {
    version: '1',
    general: {
      url: '',
      room: '',
      password: '',
      duration: 0,
      zoom: 0,
      screen: 0,
      fontColor: '',
      fontBorderColor: '',
      gpu: false,
    },
    watermark: {
      html: '',
      opacity: 0,
      color: '',
      fontSize: '',
      position: 'bottom-right',
      offset: '',
      noComments: false,
    }
  }
  expect(window.settings.postSettings).toBeCalledWith(expected)
  expect(window.close).toBeCalled()
})