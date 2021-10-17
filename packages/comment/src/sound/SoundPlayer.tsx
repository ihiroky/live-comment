import { Grid, IconButton, InputLabel, makeStyles, MenuItem, Select, Slider } from '@material-ui/core'
import { getLogger } from 'common'
import React from 'react'
import { isPlaySoundMessage, PlaySoundMessage } from '../types'
import { useExistsSounds, useSoundMetadata, usePlaySound } from './hooks'
import { NoteBlack } from './NoteBlack'
import { FAR_ENOUGH, useNamedCookies } from '../useNamedCookies'

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

export const SoundPlayer: React.FC<Props> = ({ url }: Props): JSX.Element => {
  const [cookies, modCookies] = useNamedCookies(CookieNames)
  const token = React.useMemo(() => localStorage.getItem('token') || '', [])
  const existsSounds = useExistsSounds(url, token)
  const [width, setWidth] = React.useState(window.innerWidth)
  const [volume, setVolume] = React.useState(Number(cookies.str('volume')) | 33)
  const [maxPlays, setMaxPlays] = React.useState(Number(cookies.str('maxPlays')) | 3)
  const nowPlaysRef = React.useRef(0)
  const [sounds] = useSoundMetadata(existsSounds)
  const playSound = usePlaySound()
  const style = useStyles()
  const onIconClick = React.useCallback((ev: React.MouseEvent<HTMLButtonElement>, id: string): void => {
    const message: PlaySoundMessage = { type: 'app', cmd: 'sound/play', id }
    window.parent.postMessage(message, window.location.origin)
  }, [])
  React.useEffect((): (() => void) => {
    const resizeListener = (): void => {
      setWidth(window.innerWidth)
    }
    window.addEventListener('resize', resizeListener)

    return (): void => {
      window.removeEventListener('resize', resizeListener)
    }
  }, [])
  React.useEffect((): (() => void) => {
    const messageListener = (e: MessageEvent<PlaySoundMessage>): void => {
      if (e.origin !== window.location.origin) {
        log.warn('[messageListener] Receive a message from unexpected origin:', e.origin)
        return
      }
      if (!isPlaySoundMessage(e.data)) {
        log.warn('[messageListener] Receive an unexpected message:', e.data)
        return
      }
      if (nowPlaysRef.current < maxPlays) {
        nowPlaysRef.current++
        playSound(e.data.id, volume, () => { nowPlaysRef.current-- })
      }
    }
    window.addEventListener('message', messageListener)

    return (): void => {
      window.removeEventListener('message', messageListener)
    }
  }, [volume, playSound, maxPlays])
  const onVolumeChanged = React.useCallback((_: React.ChangeEvent<unknown>, value: number | number[]): void => {
    const v = Array.isArray(value) ? value[0] : value
    setVolume(v)
    modCookies.num('volume', v, FAR_ENOUGH)
  }, [modCookies])
  const onMaxPlaysChanged = React.useCallback((e: React.ChangeEvent<{ value: unknown }>): void => {
    const v = Number(e.target.value)
    setMaxPlays(v)
    modCookies.num('maxPlays', v, FAR_ENOUGH)
  }, [modCookies])

  const xs = React.useMemo((): 12 | 6 | 4 | 3 | 2 => {
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
        <h3>Ding Dong Ring! 🔔</h3>
      </div>
      <div className={style.controls}>
        <div className={style.controlItem}>
          <InputLabel htmlFor="volume" style={{ paddingLeft: 6, paddingRight: 6 }}>Volume:</InputLabel>
          <Slider aria-label="Volume" id="volume" value={volume} onChange={onVolumeChanged} max={100} />
        </div>
        <div className={style.controlItem}>
          <InputLabel id="max-sounds-label" style={{ paddingLeft: 6, paddingRight: 6, margin: 'auto 0px' }}>Max plays:</InputLabel>
          <Select
            labelId="max-sounds-label"
            id="max-sounds"
            value={maxPlays}
            label="Max plays"
            onChange={onMaxPlaysChanged}
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
                  <IconButton data-testid={`play-${sound.id}`} onClick={e => onIconClick(e, sound.id)}>
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
