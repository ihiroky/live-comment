import { Grid, IconButton, InputLabel, MenuItem, Select, SelectChangeEvent, Slider } from '@mui/material'
import makeStyles from '@mui/styles/makeStyles'
import { getLogger } from 'common'
import { FC, MouseEvent, useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { isPlaySoundMessage, PlaySoundMessage } from '../types'
import { useToken } from '../utils/token'
import { useExistsSounds, useSoundMetadata, usePlaySound } from './hooks'
import { NoteBlack } from './NoteBlack'

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
  },
  command: {
    fontSize: 'small',
    opacity: 0.66
  },
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
  const [concurrentPlays, setConcurrentPlays] = useState(getNumberOptionValue('concurrentPlays', 3))
  const nowPlaysRef = useRef(0)
  const [sounds] = useSoundMetadata(token.payload.room, existsSounds)
  const playSound = usePlaySound(token.payload.room)
  const style = useStyles()
  const onIconClick = useCallback((ev: MouseEvent<HTMLButtonElement>, id: string): void => {
    const message: PlaySoundMessage = { type: 'app', cmd: 'sound/play', id }
    window.parent.postMessage(message, window.location.origin)
  }, [])
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
      if (nowPlaysRef.current < concurrentPlays) {
        nowPlaysRef.current++
        playSound(e.data.id, volume, () => { nowPlaysRef.current-- })
      }
    }
    window.addEventListener('message', messageListener)

    return (): void => {
      window.removeEventListener('message', messageListener)
    }
  }, [volume, playSound, concurrentPlays])
  const onVolumeChanged = useCallback((_: Event, value: number | number[]): void => {
    const v = Array.isArray(value) ? value[0] : value
    setVolume(v)
    setNumberOptionValue('volume', v)
  }, [])
  const onConcurrentPlaysChanged = useCallback((e: SelectChangeEvent<number>): void => {
    const v = Number(e.target.value)
    setConcurrentPlays(v)
    setNumberOptionValue('concurrentPlays', v)
  }, [])

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

  return (
    <div style={{ width, height: '100%' }}>
      <div className={style.title}>
        <h3>Ding Dong Ding! 🔔</h3>
      </div>
      <div className={style.controls}>
        <div className={style.controlItem}>
          <InputLabel htmlFor="volume" style={{ paddingLeft: 6, paddingRight: 6 }}>Volume:</InputLabel>
          <Slider aria-label="Volume" id="volume" value={volume} onChange={onVolumeChanged} max={100} />
        </div>
        <div className={style.controlItem}>
          <InputLabel id="conc-sounds-label" style={{ paddingLeft: 6, paddingRight: 6, margin: 'auto 0px' }}>Concurrent plays:</InputLabel>
          <Select
            labelId="conc-sounds-label"
            id="conc-sounds"
            value={concurrentPlays}
            label="Concurrent plays"
            onChange={onConcurrentPlaysChanged}
          >
            { [0, 1, 2, 3, 5, 8, 13, Infinity].map(n => <MenuItem key={`numOfSound-${n}`} value={n}>{n}</MenuItem> ) }
          </Select>
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
                    size="large">
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
