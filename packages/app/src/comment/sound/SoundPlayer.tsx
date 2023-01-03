import { FormControl, FormControlLabel, FormGroup, Grid, IconButton, Switch } from '@mui/material'
import { makeStyles } from '@mui/styles'
import { getLogger } from '@/common/Logger'
import { FC, MouseEvent, useState, useCallback, useEffect, useMemo } from 'react'
import { isPlaySoundMessage, PlaySoundMessage } from '@/sound/types'
import { useToken } from '../utils/token'
import { useExistsSounds, useSoundMetadata, usePlaySound } from './hooks'
import { NoteBlack } from './NoteBlack'
import { Preferences } from './Preferences'

type Props = {
  url: string
}

const CookieNames = [
  'volume',
  'maxPlays',
] as const
export type CookieName = typeof CookieNames[number]

const useStyles = makeStyles({
  title: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
  },
  controlItem: {
    display: 'flex',
  },
  list: {
    overflowY: 'auto',
    paddingTop: 6,
    // title height(60px) + control height(60px) + paddingTop(6px)
    height: 'calc(100% - 126px)',
  },
  item: {
    display: 'flex',
    flexWrap: 'nowrap',
    fontSize: '13px',
  },
  command: {
    fontSize: 'small',
    opacity: 0.66
  },
  preferences: {
    padding: '6px',
  }
})

const log = getLogger('sound/SoundPlayer')

type OptionKey = 'volume' | 'concurrentPlays'

function getNumberOptionValue(key: OptionKey, defalutValue: number): number {
  const s = window.localStorage.getItem(key)
  return s !== null ? Number(s) : defalutValue
}

function setNumberOptionValue(key: OptionKey, value: number): void {
  window.localStorage.setItem(key, value.toString())
}

export const SoundPlayer: FC<Props> = ({ url }: Props): JSX.Element => {
  const token = useToken()
  const existsSounds = useExistsSounds(url, token.value, token.payload.room)
  const [width, setWidth] = useState(window.innerWidth)
  const [volume, setVolume] = useState(getNumberOptionValue('volume', 10))
  const [prefsShown, setPrefsShown] = useState(false)
  const [sounds] = useSoundMetadata(token.payload.room, existsSounds)
  const playSound = usePlaySound(token.payload.room)
  const [playRequested, setPlayRequested] = useState<boolean>(false)
  const style = useStyles()
  const onIconClick = useCallback((ev: MouseEvent<HTMLButtonElement>, id: string): void => {
    if (playRequested) {
      return
    }
    setPlayRequested(true)
    window.setTimeout((): void => {
      setPlayRequested(false)
    }, 3000)
    const message: PlaySoundMessage = { type: 'app', cmd: 'sound/play', id }
    window.parent.postMessage(message, window.location.origin)
  }, [playRequested])
  useEffect((): (() => void) => {
    const resizeListener = (): void => {
      setWidth(window.innerWidth)
    }
    window.addEventListener('resize', resizeListener)

    return (): void => {
      window.removeEventListener('resize', resizeListener)
    }
  }, [])
  useEffect((): (() => void) => {
    const messageListener = (e: MessageEvent<PlaySoundMessage>): void => {
      if (e.origin !== window.location.origin) {
        log.warn('[messageListener] Receive a message from unexpected origin:', e.origin)
        return
      }
      if (!isPlaySoundMessage(e.data)) {
        log.warn('[messageListener] Receive an unexpected message:', e.data)
        return
      }
      playSound(e.data.id, volume, () => undefined)
    }
    window.addEventListener('message', messageListener)

    return (): void => {
      window.removeEventListener('message', messageListener)
    }
  }, [playSound, volume])
  const onVolumeChanged = useCallback((volume: number): void => {
    setVolume(volume)
    setNumberOptionValue('volume', volume)
  }, [setVolume])

  const xs = useMemo((): 12 | 6 | 4 | 3 | 2 => {
    const cols = width <= 250 ? 1
      : width <= 500 ? 2
        : width <= 750 ? 3
          : width <= 1000 ? 4
            : 6
    log.debug('cols', width, cols)
    return cols === 1 ? 12
      : cols === 2 ? 6
        : cols === 3 ? 4
          : cols === 4 ? 3
            : 2
  }, [width])

  /*
    TODO サーバーと通し
  */
  return (
    <div style={{ width, height: '100%' }}>
      <div className={style.title}>
        <h3>Ding Dong Ding! 🔔</h3>
      </div>
      <div className={style.controls}>
        <div className={style.controlItem}>
          <FormControl component="fieldset" variant="standard">
            <FormGroup>
              <FormControlLabel label="Show preferences" control={
                <Switch checked={prefsShown} onChange={(_, checked) => {setPrefsShown(checked)}} name="prefs" />
              }/>
            </FormGroup>
          </FormControl>
        </div>
        <div className={[style.controlItem, style.preferences].join(' ')}>
          {prefsShown &&
            <Preferences
              url={url}
              room={token.payload.room}
              token={token.value}
              volume={volume}
              volumeChanged={onVolumeChanged}
            />
          }
        </div>
      </div>
      <div className={style.list}>
        <Grid container spacing={0}>
          {
            sounds && Object.values(sounds).map((sound) => (
              <Grid key={sound.id} item xs={xs}>
                <div className={style.item}>
                  <IconButton
                    data-testid={`play-${sound.id}`}
                    onClick={e => onIconClick(e, sound.id)}
                    size="large"
                    disabled={playRequested}
                  >
                    <NoteBlack />
                  </IconButton>
                  <div>
                    <div>{sound.displayName}</div>
                    <div className={style.command}>{sound.command.join(', ')}</div>
                  </div>
                </div>
              </Grid>
            ))
          }
        </Grid>
      </div>
    </div>
  )
}
