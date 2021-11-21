import { Alert, Input, InputLabel, Slider } from '@mui/material'
import { fetchWithTimeout } from '@/common/utils'
import { FC, useState, useCallback, useEffect, ChangeEvent } from 'react'

type OptionKey = 'ddd.volume'

function getNumberOptionValue(key: OptionKey, defalutValue: number): number {
  const s = window.localStorage.getItem(key)
  return s !== null ? Number(s) : defalutValue
}

function setNumberOptionValue(key: OptionKey, value: number): void {
  window.localStorage.setItem(key, value.toString())
}

function uploadZipAsync(url: string, token: string, zipBlob: Blob): Promise<void> {
  return fetchWithTimeout(
    `${url}/sounds/file`,
    {
      method: 'POST',
      cache: 'no-store',
      mode: 'cors',
      headers: {
        'Content-Type': 'applicaton/zip',
        'Authorization': `Bearer ${token}`,
      },
      body: zipBlob,
    },
    3000
  ).then((res: Response): void => {
    if (!res.ok) {
      throw new Error('Failed to upload file.')
    }
  })

}

function downloadZipAsync(url: string, token: string): Promise<Blob> {
  return fetchWithTimeout(
    `${url}/sounds/file`,
    {
      method: 'GET',
      cache: 'no-store',
      mode: 'cors',
      headers: {
        'Accept': 'application/zip',
        'Authorization': `Bearer ${token}`,
      },
    },
    3000
  ).then((res: Response): Promise<Blob> => {
    if (!res.ok) {
      throw new Error('Failed to download sound file.')
    }
    return res.blob()
  })
}

function saveAsZipFile(room: string): (zipBlob: Blob) => void {
  return (zipBlob: Blob): void => {
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    document.body.appendChild(a)
    a.download = room + '.zip'
    a.href = url
    a.click()
    window.setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 0)
  }
}

type AlertType = 'downloadSound' | 'uploadSound'

type Props = {
  url: string
  room: string
  token: string
}

export const Preferences: FC<Props> = (props: Props): JSX.Element => {
  const [volume, setVolume] = useState(getNumberOptionValue('ddd.volume', 10))
  const [alert, setAlert] = useState<{ type: AlertType, message: string } | null>(null)
  const onVolumeChanged = useCallback((_: Event, value: number | number[]): void => {
    const v = Array.isArray(value) ? value[0] : value
    setVolume(v)
    setNumberOptionValue('ddd.volume', v)
  }, [])
  const onSoundDownloadClicked = useCallback((): void => {
    downloadZipAsync(props.url, props.token)
      .then(saveAsZipFile(props.room))
      .catch((e: unknown): void => {
        setAlert({
          type: 'downloadSound',
          message: 'Failed to download sound file' + (e ? ': ' + String(e) : '')
        })
      })
  }, [props.url, props.room, props.token])
  const onSoundUploadClicked = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    const input = e.target
    if (input === null || !input.files || !input.files[0]) {
      return
    }
    uploadZipAsync(props.url, props.token, input.files[0])
      .catch ((e: unknown): void => {
        setAlert({
          type: 'uploadSound',
          message: 'Failed to upload sound file' + (e ? ': ' + String(e) : '')
        })
      })
  }, [props.url, props.token])

  useEffect((): void => {
    if (alert) {
      window.setTimeout((): void => { setAlert(null) }, 5000)
    }
  })

  return (
    <div>
      <div>
        <div>Local preferences</div>
        <div>
          <div>Volume</div>
          <div>
            <InputLabel htmlFor="volume" style={{ paddingLeft: 6, paddingRight: 6 }}>Volume:</InputLabel>
            <Slider aria-label="Volume" id="volume" value={volume} onChange={onVolumeChanged} max={100} />
          </div>
        </div>
      </div>
      <div>
        <div>Room global preferences</div>
        <div>
          <div>
            <div>Sounds</div>
            <div>
              <Input type="button" value="Download" onClick={onSoundDownloadClicked} />
              {alert && alert.type === 'downloadSound' && (
                <Alert severity="error">{alert.message}</Alert>
              )}
            </div>
            <div>
              <Input type="file" placeholder="Select zip file, then upload." onChange={onSoundUploadClicked} />
              {alert && alert.type === 'uploadSound' && (
                <Alert severity="error">{alert.message}</Alert>
              )}
            </div>
          </div>
        </div>
      </div>
      <div></div>
    </div>
  )
}