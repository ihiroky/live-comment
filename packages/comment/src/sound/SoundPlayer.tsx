import { Grid, IconButton, makeStyles } from '@material-ui/core'
import React from 'react'
import { useExistsSounds, useSounds, usePlaySound, useRoomHash } from './hooks'
import { NoteBlack } from './NoteBlack'

type Props = {
  url: string
}

const useStyles = makeStyles({
  title: {
    height: 48,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  item: {
    display: 'flex',
    flexWrap: 'nowrap',
  }
})

export const SoundPlayer: React.FC<Props> = ({ url }: Props): JSX.Element => {
  const [room, hash] = useRoomHash()
  const existsSounds = useExistsSounds(url, room, hash)
  const [width, setWidth] = React.useState(window.innerWidth)
  const sounds = useSounds(existsSounds)
  const playSound = usePlaySound()
  const style = useStyles()
  const onIconClick = React.useCallback((ev: React.MouseEvent<HTMLButtonElement>, data: Uint8Array): void => {
    const button = ev.currentTarget
    button.disabled = true
    playSound(data, (): void => { button.disabled = false})
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
    return cols === 1 ? 12
      : cols === 2 ? 6
        : cols === 3 ? 4
          : cols === 4 ? 3
            : 2
  }, [width])

  return (
    <div style={{ width }}>
      <Grid container spacing={0}>
        <Grid item xs={12} className={style.title}>
          <div>Ding Dong Ring</div>
        </Grid>
        {
          sounds?.map((sound) => (
            <Grid key={sound.name[0]} item xs={xs}>
              <div className={style.item}>
                <IconButton id='test' onClick={e => onIconClick(e, sound.data)}>
                  <NoteBlack />
                </IconButton>
                <div>
                  <div>{sound.displayName}</div>
                  <div>{sound.name.join(', ')}</div>
                </div>
              </div>
            </Grid>
          ))
        }
      </Grid>

    </div>
  )
}
