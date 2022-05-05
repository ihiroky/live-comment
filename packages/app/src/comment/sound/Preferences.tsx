import { Alert, AlertColor, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, InputLabel, Slider, Snackbar, Tooltip } from '@mui/material'
import { makeStyles } from '@mui/styles'
import { fetchWithTimeout, isObject } from '@/common/utils'
import { FC, useState, useCallback, useEffect, ChangeEvent } from 'react'

function uploadZipAsync(url: string, token: string, zipFile: File): Promise<unknown> {
  return fetchWithTimeout(
    `${url}/sound/file`,
    {
      method: 'POST',
      cache: 'no-store',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/zip',
        'Authorization': `Bearer ${token}`,
      },
      body: zipFile,
    },
    3000
  ).then((res: Response): Promise<object> => {
    return res.json()
  })
}

function downloadZipAsync(url: string, token: string, setAlert: (msg: AlertMessage | null) => void): Promise<Blob> {
  return fetchWithTimeout(
    `${url}/sound/file`,
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
  ).then(async (res: Response): Promise<Blob> => {
    if (!res.ok) {
      throw new Error('Failed to download sound file.')
    }
    if (!res.body) {
      throw new Error('Empty response.')
    }
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let downloadSize = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (value) {
        chunks.push(value)
        downloadSize += value.byteLength
        setAlert({
          type: 'downloadSound',
          severity: 'info',
          message: `Downloading... ${downloadSize} bytes.`,
        })
      }
    }
    setAlert(null)
    return new Blob(chunks, { type: 'application/zip' })
  })
}

function saveAsZipFile(room: string): (zipBlob: Blob) => void {
  return (zipBlob: Blob): void => {
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.download = room + '.zip'
    a.href = url
    document.body.appendChild(a)
    a.click()
    window.setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 0)
  }
}

type AlertMessage = {
  severity: AlertColor
  message: string
}

/*
 * uploadStatus transition:
 *
 * selecting -[click upload]-> confirming -+-[click confirm]-> uploading -+-[finish upload]-> done
 *     ^                                   v                              |                    |
 *     +---------------------------- [click cancel]                       v                [timeout]
 *     +-----------------------------------------------------------[upload error]              |
 *     +---------------------------------------------------------------------------------------+
 */
type UploadStatus = 'selecting' | 'confirming' | 'uploading' | 'done'

type Props = {
  url: string
  room: string
  token: string
  volume: number
  volumeChanged: (volume: number) => void
}

const useStyles = makeStyles({
  item: {
    paddingLeft: 6,
    paddingRight: 6,
  },
})

export const Preferences: FC<Props> = ({url, room, token, volume, volumeChanged}: Props): JSX.Element => {
  const [alert, setAlert] = useState<AlertMessage | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('selecting')
  const onVolumeChanged = useCallback((_: Event, value: number | number[]): void => {
    const v = Array.isArray(value) ? value[0] : value
    volumeChanged(v)
  }, [volumeChanged])
  const onSoundDownloadClicked = useCallback((): void => {
    downloadZipAsync(url, token, setAlert)
      .then(saveAsZipFile(room))
      .catch((e: unknown): void => {
        setAlert({
          severity: 'error',
          message: 'Failed to download sound file' + (e ? ': ' + String(e) : '')
        })
      })
  }, [url, room, token])
  const onFileSelected = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    const input = e.target
    if (input === null || !input.files || !input.files[0]) {
      return
    }
    setSelectedFile(input.files[0])
  }, [])
  const onUploadClicked = useCallback((): void => {
    if (uploadStatus !== 'selecting') {
      setAlert({
        severity: 'error',
        message: 'Uploading is already in progress.'
      })
      return
    }
    if (selectedFile === null) {
      setAlert({
        severity: 'error',
        message: 'No file selected.'
      })
      return
    }
    setUploadStatus('confirming')
  }, [uploadStatus, selectedFile])
  const onUploadCancelled = useCallback((): void => {
    setUploadStatus('selecting')
    setSelectedFile(null)
  }, [])
  const onUploadConfirmed = useCallback((): void => {
    if (!selectedFile) {
      return
    }
    uploadZipAsync(url, token, selectedFile)
      .then((message: unknown): void => {
        if (isObject(message) && message.message) {
          setAlert({
            severity: 'error',
            message: String(message.message),
          })
        } else {
          setAlert({
            severity: 'info',
            message: 'File uploaded successfully.'
          })
        }
      })
      .catch ((e: unknown): void => {
        setAlert({
          severity: 'error',
          message: 'Failed to upload sound file' + (e ? ': ' + String(e) : '')
        })
      }).then((): void => {
        setUploadStatus('selecting')
      })
    setAlert(null)
    setSelectedFile(null)
    setUploadStatus('uploading')
  }, [url, token, selectedFile])

  const style = useStyles()

  return (
    <div className="">
      <div className={style.item}>
        <div>
          <InputLabel htmlFor="volume">Volume:</InputLabel>
          <Slider aria-label="Volume" id="volume" value={volume} onChange={onVolumeChanged} max={100} />
        </div>
      </div>
      <div className={style.item}>
        <div>
          <div>
            <InputLabel htmlFor="sound">Sound:</InputLabel>
            <div id="sound">
              <Button variant="text" type="button" onClick={onSoundDownloadClicked}>Download</Button>
            </div>
            <div>
              <input type="file" id="upload-zip" style={{ display: 'none' }} accept="application/zip" onChange={onFileSelected} />
              <label htmlFor="upload-zip">
                <Button variant="text" component="span">Select zip</Button>
              </label>
              <span>, then</span>
              <Button variant="text" onClick={onUploadClicked}>Upload</Button>
              <UploadAlertDialog open={uploadStatus === 'confirming'} onCancelled={onUploadCancelled} onConfirmed={onUploadConfirmed} />
              {selectedFile && (
                <Tooltip title="Click to cancel">
                  <Alert severity="info" onClick={() => { setSelectedFile(null) }}>{selectedFile.name}</Alert>
                </Tooltip>
              )}
              <Snackbar open={alert !== null} autoHideDuration={5000} onClose={() => {
                if (uploadStatus === 'done') {
                  setUploadStatus('selecting')
                }
                setAlert(null)
              }}>
                {alert ? <Alert severity={alert.severity}>{alert.message}</Alert> : undefined}
              </Snackbar>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type UploadAlertDialogProps = {
  open: boolean
  onCancelled: () => void
  onConfirmed: () => void
}

function UploadAlertDialog({ open, onCancelled, onConfirmed }: UploadAlertDialogProps): JSX.Element {
  return (
    <Dialog open={open} onClose={onCancelled}>
      <DialogTitle>Upload Sound File</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Uploading sound file to the server will overwrite the current sound file for everyone in the room.
          Are you sure you want to upload?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancelled} color="primary" autoFocus>
          Cancel
        </Button>
        <Button onClick={onConfirmed} color="primary">
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  )
}