import { loadDefault, parse } from './settings'
import { test, expect } from '@jest/globals'

test('loadDefault', () => {
  const settings = loadDefault()

  expect(settings.version).toBe('1')
  expect(settings.general).toEqual({
    duration: 9,
    fontBorderColor: '#cccccc',
    fontColor: '#111111',
    gpu: process.platform === 'win32',
    password: '',
    room: '',
    screen: 0,
    url: 'ws://localhost:8080',
    zoom: 100,
  })
  expect(settings.watermark).toEqual({
    html: '',
    opacity: 0.7,
    color: '#333333',
    fontSize: '64px',
    position: 'bottom-right',
    offset: '3%',
    noComments: false
  })
})

test('parse v1', () => {
  const json = `{
    "version":"1",
    "general":{
      "url":"wss://a/b",
      "room":"aaa",
      "password":"bbb",
      "duration":7,
      "zoom":"99",
      "screen":0,
      "fontColor":"#111111",
      "fontBorderColor":"#cccccc",
      "gpu":false
    },
    "watermark":{
      "html":"Confidential",
      "opacity":0.3,
      "color":"#F00",
      "fontSize":"64px",
      "position":"bottom-right",
      "offset":"3%",
      "noComments":"false"
    }
  }`
  const settings = parse(json)

  expect(settings.version).toBe('1')
  expect(settings.general).toEqual({
    url: "wss://a/b",
    room: "aaa",
    password: "bbb",
    duration: 7,
    zoom: 100, // default value because type difference
    screen :0,
    fontColor: "#111111",
    fontBorderColor: "#cccccc",
    gpu: false,
  })
  expect(settings.watermark).toEqual({
    html: "Confidential",
    opacity: 0.3,
    color: "#F00",
    fontSize: "64px",
    position: "bottom-right",
    offset: "3%",
    noComments: false, // default value because type difference
  })
})

test('parse v0', () => {
  const json = `{
    "version": "0",
    "url": "url",
    "room": "room",
    "password": "password",
    "duration": "9",
    "zoom": "100",
    "screen": "0"
  }`
  const d = loadDefault()

  const settings = parse(json)

  expect(settings.version).toBe("1")
  expect(settings.general).toEqual({
    url: "url",
    room: "room",
    password: "password",
    duration: 9,
    zoom: 100,
    screen: 0,
    fontColor: d.general.fontColor,
    fontBorderColor: d.general.fontBorderColor,
    gpu: d.general.gpu,
  })
  expect(settings.watermark).toEqual(d.watermark)
})

test('parse no version', () => {
  const json = '{}'

  const settings = parse(json)

  expect(settings).toEqual(loadDefault())
})
