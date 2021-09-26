import { Grid, IconButton, makeStyles } from '@material-ui/core'
import { getLogger } from 'common'
import React from 'react'
import { useExistsSounds, useSoundMetadata, usePlaySound, useRoomHash } from './hooks'
import { NoteBlack } from './NoteBlack'

type Props = {
  url: string
}

const useStyles = makeStyles({
  title: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  volume: {
    display: 'flex',
    justifyContent: 'center',
  },
  list: {
    overflowY: 'auto',
    paddingTop: 6,
    // 90px: title height(60px) + volume height(24px) + paddingTop(6px)
    height: 'calc(100% - 90px)',
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
  const [room, hash] = useRoomHash()
  const existsSounds = useExistsSounds(url, room, hash)
  const [width, setWidth] = React.useState(window.innerWidth)
  const [volume, setVolume] = React.useState(100)
  const [sounds] = useSoundMetadata(existsSounds)
  const playSound = usePlaySound()
  const style = useStyles()
  const onIconClick = React.useCallback((ev: React.MouseEvent<HTMLButtonElement>, id: string, volume: number): void => {
    //window.parent.postMessage()
    const button = ev.currentTarget
    button.disabled = true
    playSound(id, volume, (): void => { button.disabled = false})
  }, [playSound])

  React.useEffect((): void => {
    window.addEventListener('resize', (): void => {
      setWidth(window.innerWidth)
    })
  }, [])
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
      <div className={style.volume}>
        <label htmlFor="volume" style={{ padding: "0px 8px" }}>Vol:</label>
        <input
          type="range" id="volume" min={0} max={100} value={volume}
          onChange={ev => setVolume(Number(ev.target.value))}
        />
      </div>
      <div className={style.list}>
        <Grid container spacing={0}>
          {
            sounds && Object.values(sounds).map((sound) => (
              <Grid key={sound.id} item xs={xs}>
                <div className={style.item}>
                  <IconButton id='test' onClick={e => onIconClick(e, sound.id, volume)}>
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
