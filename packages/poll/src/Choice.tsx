import React from 'react'
import {
  Button,
  Grid,
  makeStyles,
} from '@material-ui/core'
import { Mode, PollEntry } from './types'

const blinkDurationMillis = 1000
const useStyles = makeStyles({
  blink: {
    animationName: '$flash',
    animationTimingFunction: 'linear',
    animationDuration: `${blinkDurationMillis}ms`
  },
  '@keyframes flash': {
    '0%': {
      background: 'transparent',
    },
    '50%': {
      background: '#99ffcc',
    },
    '100%': {
      background: 'transparent',
    },
  }
})

function useBlinksCountedUpEntries(entries: PollEntry[], blinkClass: string): void {
  const [prevCounts, setPrevCounts] = React.useState<number[]>([])
  const blinkReadyIdSetRef = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    if (prevCounts.length !== entries.length) {
      setPrevCounts(entries.map(e => e.count))
      return
    }
    if (entries.every(e => e.count === 0)) {
      return
    }

    const blinkIds = entries
      .filter((e, i) => prevCounts[i] < e.count)
      .map(e => String(e.key))
    for (const id of blinkIds) {
      const blinkReadyIdSet = blinkReadyIdSetRef.current
      if (blinkReadyIdSet.has(id)) {
        continue
      }
      const element = document.getElementById(String(id))
      if (!element) {
        continue
      }

      // https://developer.mozilla.org/ja/docs/Web/CSS/CSS_Animations/Tips#run_an_animation_again
      const pureClassList = Array.from(element.classList).filter(c => c !== blinkClass)
      element.className = pureClassList.join(' ')
      blinkReadyIdSet.add(id)
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          element.className = [
            ...pureClassList,
            blinkClass
          ].join(' ')
          blinkReadyIdSet.delete(id)
        })
      })
    }

    entries.forEach((e: PollEntry, i: number): void => {
      prevCounts[i] = e.count
    })
  }, [entries])
}


export function Choice({ entries, mode, descClass, topClass, onRemoveEntry }: {
  entries: PollEntry[]
  mode: Mode
  descClass: string
  topClass: string
  onRemoveEntry: (index: number) => void
}): JSX.Element | null {
  const classes = useStyles()
  useBlinksCountedUpEntries(entries, classes.blink)
  const highestCount = React.useMemo((): number => {
    if (entries.length === 0) {
      return 0
    }
    const highestCount = entries.sort((a, b) => b.count - a.count)[0].count
    // Count zero is not top.
    return Math.max(highestCount, 1)
  }, [entries])

  if (mode === 'result-graph') {
    return null
  }

  // TODO Emphasize top result
  return (
    <>
      {entries.map((entry: PollEntry, index: number): JSX.Element => (
        <Grid item xs={12} key={entry.key} id={String(entry.key)}>
          <Grid container className={entry.count === highestCount ? topClass : ''}>
            <Grid item xs={1} />
            <Grid item xs={1}>{index + 1}</Grid>
            <Grid item xs={8} className={descClass}>{entry.description}</Grid>
            <Grid item xs={1}>
              {
                mode === 'edit'
                  ? <Button variant="outlined" onClick={() => onRemoveEntry(index)}>Del</Button>
                  : null
              }
              {
                mode === 'result-list'
                  ? <div>{entry.count}</div>
                  : null
              }
            </Grid>
            <Grid item xs={1} />
          </Grid>
        </Grid>
      ))}
    </>
  )
}
