import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import { sign } from 'jsonwebtoken'
import { Preferences } from './Preferences'
import { fetchWithTimeout } from '@/common/utils'
import { Deffered } from '@/common/Deffered'



jest.mock('@/common/utils')

beforeEach(() => {
  if (!URL.createObjectURL) {
    URL.createObjectURL = jest.fn().mockImplementation(() => 'data://')
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = jest.fn()
  }
})

test('Volume is changed if move slider', async () => {
  const room = 'room'
  const token = sign({ room }, 'hoge')
  const volume = 10
  const volumeChanged = jest.fn()

  render(<Preferences
    url="http://localhost/"
    room={room}
    token={token}
    volume={volume}
    volumeChanged={volumeChanged}
  />)

  const slider = screen.getByLabelText('Volume')
  // (150, 150) may be the position slider value is 100.
  userEvent.click(slider, { clientX: 150, clientY: 150 })

  await waitFor(() => expect(volumeChanged).toBeCalledWith(100))
})

test('Show alert if fetching sound file failed', async () => {
  const room = 'room'
  const token = sign({ room }, 'hoge')
  const volume = 10
  const volumeChanged = jest.fn()

  const fetchResult = Promise.resolve({
    ok: false,
    status: 500,
  } as Response)
  jest.mocked(fetchWithTimeout).mockReturnValue(fetchResult)

  render(<Preferences
    url="http://localhost/"
    room={room}
    token={token}
    volume={volume}
    volumeChanged={volumeChanged}
  />)

  const downloadButton = screen.getByText('Download')
  userEvent.click(downloadButton)

  await waitFor(() => {
    screen.getByText(/Error: Unexpected response: 500/)
  })
})

test('Show alert if there is no response body', async () => {
  const room = 'room'
  const token = sign({ room }, 'hoge')
  const volume = 10
  const volumeChanged = jest.fn()

  const fetchResult = Promise.resolve({
    ok: true,
    status: 200,
  } as Response)
  jest.mocked(fetchWithTimeout).mockReturnValue(fetchResult)

  render(<Preferences
    url="http://localhost/"
    room={room}
    token={token}
    volume={volume}
    volumeChanged={volumeChanged}
  />)

  const downloadButton = screen.getByText('Download')
  userEvent.click(downloadButton)

  await waitFor(() => {
    screen.getByText(/Error: Empty response body/)
  })
})

test('Download sound file.', async () => {
  const room = 'room'
  const token = sign({ room }, 'hoge')
  const volume = 10
  const volumeChanged = jest.fn()

  const firstRead: ReadableStreamDefaultReadResult<Uint8Array> = {
    done: false,
    value: new Uint8Array(['a'.charCodeAt(0)]),
  }
  const secondReadDeffered = new Deffered<ReadableStreamDefaultReadResult<Uint8Array>>()
  const fetchResult = Promise.resolve({
    ok: true,
    status: 200,
    body: {
      getReader: (): ReadableStreamDefaultReader<Uint8Array> => {
        return {
          closed: Promise.resolve(undefined),
          read: jest.fn()
            .mockResolvedValueOnce(firstRead)
            .mockResolvedValueOnce(secondReadDeffered.promise),
          cancel: jest.fn(),
          releaseLock: jest.fn(),
        }
      },
    }
  } as Response)
  jest.mocked(fetchWithTimeout).mockReturnValue(fetchResult)

  render(<Preferences
    url="http://localhost/"
    room={room}
    token={token}
    volume={volume}
    volumeChanged={volumeChanged}
  />)

  const downloadButton = screen.getByText('Download')
  userEvent.click(downloadButton)

  await waitFor(() => {
    screen.getByText(/Downloading\.\.\. [0-9]+ bytes./)
  }, { interval: 10 })
  secondReadDeffered.resolve({
    done: true,
    value: undefined,
  })
  await waitFor(() => {
    const info = screen.queryByText(/Downloading\.\.\. [0-9]+ bytes./)
    expect(info).toBeNull()
  }, { interval: 10 })
  await waitFor(() => {
    screen.getByTestId('download-link')
  }, { interval: 10 })
  await waitFor(() => {
    const link = screen.queryByRole('link', { name: /^data:/ })
    expect(link).toBeNull()
  }, { interval: 10 })
})

test('Upload sound file', async () => {
  const room = 'room'
  const token = sign({ room }, 'hoge')
  const volume = 10
  const volumeChanged = jest.fn()
  jest.mocked(fetchWithTimeout).mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({}) as unknown,
  } as Response)

  render(<Preferences
    url="http://localhost/"
    room={room}
    token={token}
    volume={volume}
    volumeChanged={volumeChanged}
  />)

  const fileInput = screen.getByLabelText('Select zip')
  userEvent.upload(fileInput, { path: 'config/sounds/test.zip' } as File)
  const uploadButton = screen.getByText('Upload')
  userEvent.click(uploadButton)

  await waitFor(() => {
    screen.getByText(/Are you sure you want to upload\?/)
  })
  const confirm = screen.getByRole('button', { name: 'Upload' })
  screen.getByRole('button', { name: 'Cancel' })
  userEvent.click(confirm)

  await waitFor(() => {
    screen.getByText(/File uploaded successfully\./)
  })
})

test('Cancel to upload sound file ', async () => {
  const room = 'room'
  const token = sign({ room }, 'hoge')
  const volume = 10
  const volumeChanged = jest.fn()
  jest.mocked(fetchWithTimeout).mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({}) as unknown,
  } as Response)

  render(<Preferences
    url="http://localhost/"
    room={room}
    token={token}
    volume={volume}
    volumeChanged={volumeChanged}
  />)

  const fileInput = screen.getByLabelText('Select zip')
  userEvent.upload(fileInput, { path: 'config/sounds/test.zip' } as File)
  const uploadButton = screen.getByText('Upload')
  userEvent.click(uploadButton)

  await waitFor(() => {
    screen.getByText(/Are you sure you want to upload\?/)
  })
  screen.getByRole('button', { name: 'Upload' })
  const cancel = screen.getByRole('button', { name: 'Cancel' })
  userEvent.click(cancel)

  await waitFor(() => {
    const cancel = screen.queryByRole('button', { name: 'Cancel' })
    expect(cancel).toBeNull()
  })
})

test('Fetch filed on uploading file', async () => {
  const room = 'room'
  const token = sign({ room }, 'hoge')
  const volume = 10
  const volumeChanged = jest.fn()
  jest.mocked(fetchWithTimeout).mockRejectedValue(new Error('hoge'))

  render(<Preferences
    url="http://localhost/"
    room={room}
    token={token}
    volume={volume}
    volumeChanged={volumeChanged}
  />)

  const fileInput = screen.getByLabelText('Select zip')
  userEvent.upload(fileInput, { path: 'config/sounds/test.zip' } as File)
  const uploadButton = screen.getByText('Upload')
  userEvent.click(uploadButton)

  await waitFor(() => {
    screen.getByText(/Are you sure you want to upload\?/)
  })
  const confirm = screen.getByRole('button', { name: 'Upload' })
  userEvent.click(confirm)

  await waitFor(() => {
    screen.getByText(/Error: hoge/)
  })
})
