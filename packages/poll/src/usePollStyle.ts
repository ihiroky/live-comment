import {
  makeStyles,
} from '@material-ui/core'

export const usePollStyles = makeStyles(() => ({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ui: {
    width: '800px',
    padding: '8px'
  },
  title: {
    width: '100%',
    paddingBottom: '8px',
    fontSize: '32px',
    fontWeight: 'bold',
  },
  description: {
    width: '100%',
    fontSize: '24px',
    fontWeight: 'bolder',
  },
}))