import React from 'react'
import { Button, Grid } from '@mui/material'
import makeStyles from '@mui/styles/makeStyles'
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

function elementIdOf(e: PollEntry): string {
  return 'choice-element-' + e.key
}

export function useBlinkCountedUpEntries(entries: PollEntry[], blinkClass: string): void {
  // const [prevCounts, setPrevCounts] = React.useState<number[]>([])
  const prevCountsRef = React.useRef<number[]>([])
  const blinkReadyIdSetRef = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    if (prevCountsRef.current.length !== entries.length) {
      prevCountsRef.current = entries.map(e => e.count)
      return
    }
    if (entries.every(e => e.count === 0)) {
      return
    }

    const blinkIds = entries
      .filter((e, i) => prevCountsRef.current[i] < e.count)
      .map(e => elementIdOf(e))
    for (const id of blinkIds) {
      const blinkReadyIdSet = blinkReadyIdSetRef.current
      if (blinkReadyIdSet.has(id)) {
        continue
      }
      const element = document.getElementById(id)
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
    prevCountsRef.current = entries.map(e => e.count)
  }, [entries, blinkClass, prevCountsRef])
}


export function Choice({ entries, mode, descClass, topClass, onRemoveEntry }: {
  entries: PollEntry[]
  mode: Mode
  descClass: string
  topClass: string
  onRemoveEntry: (index: number) => void
}): JSX.Element | null {
  const classes = useStyles()
  useBlinkCountedUpEntries(entries, classes.blink)
  const highestCount = React.useMemo((): number => {
    if (entries.length === 0 || (mode !== 'result-list' && mode !== 'result-graph')) {
      return -1
    }
    const highestCount = Math.max(...entries.map(e => e.count))
    // Count zero is not top.
    return Math.max(highestCount, 1)
  }, [entries, mode])

  if (mode === 'result-graph') {
    return null
  }

  const isResultList = mode === 'result-list'
  return (
    <>
      {entries.map((entry: PollEntry, index: number): JSX.Element => (
        <Grid item xs={12} key={entry.key} id={elementIdOf(entry)}>
          <Grid container className={isResultList && (entry.count === highestCount) ? topClass : ''}>
            <Grid item xs={1} />
            <Grid item xs={1}>{index + 1}</Grid>
            <Grid item xs={8} className={descClass}>{entry.description}</Grid>
            <Grid item xs={1}>
              {
                mode === 'edit'
                  ? <Button variant="outlined" onClick={(): void => onRemoveEntry(index)}>Del</Button>
                  : null
              }
              {
                isResultList
                  ? <div className={descClass}>{entry.count}</div>
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
