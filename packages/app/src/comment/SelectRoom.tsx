import { FC, useCallback, useEffect, useSyncExternalStore } from 'react'
import { Box, Divider, Grid, Link, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, styled }from '@mui/material'
import SpeakerNotesRounded from '@mui/icons-material/SpeakerNotesOutlined'
import { Message, isAcnOkMessage, isAcnRoomsMessage, isErrorMessage } from '@/common/Message'
import { gotoCommentPage, gotoLoginPage, login, removeToken, setToken } from './utils/pages'
import { NavigateFunction } from 'react-router-dom'
import { getLogger } from '@/common/Logger'
import { fetchWithTimeout } from '@/common/utils'

const log = getLogger('SelectRoom')

const roomsStore = {
  snapshot: {
    nid: '',
    rooms: new Array<{ room: string, hash: string }>(),
    error: '',
  },
  callbacks: new Array<() => void>(),

  fetch: (apiUrl: string):void => {
    fetchWithTimeout(`${apiUrl}/rooms`, {
      mode: 'cors',
      credentials: 'include',
    }, 3000).then((res: Response): void => {
      if (!res.ok) {
        roomsStore.snapshot = {
          nid: '',
          rooms: [],
          error: 'Fetch failed.'
        }
        roomsStore.callbacks.forEach(c => c())
        return
      }
      res.json().then((message: unknown): void => {
        if (isAcnRoomsMessage(message)) {
          roomsStore.snapshot = {
            nid: message.nid,
            rooms: message.rooms,
            error: ''
          }
          roomsStore.callbacks.forEach(c => c())
        } else if (isErrorMessage(message)) {
          roomsStore.setError(message.message)
        } else {
          roomsStore.setError(`Unexpected message: ${JSON.stringify(message)}`)
        }
      })
    })
  },
  setError: (error: string): void => {
    roomsStore.snapshot = {
      nid: '',
      rooms: [],
      error: error
    }
    roomsStore.callbacks.forEach(c => c())
  },
  subscribe: (callback: () => void): () => void => {
    roomsStore.callbacks = [...roomsStore.callbacks, callback]
    return (): void => {
      roomsStore.callbacks = roomsStore.callbacks.filter(l => l !== callback)
    }
  },
  getSnapshot: () => {
    return roomsStore.snapshot
  }
}

type SelectRoomProps = {
  apiUrl: string
  navigate: NavigateFunction | undefined
}

const Root = styled('div')({
  width: '100%',
  height: '100%',
  display: 'flex',
  justifyContent: 'center',
  overflow: 'hidden',
  backgroundColor: '#ccffcc',
  padding: '8px',
})

const Form = styled('div')({
  minWidth: '300px',
  width: '400px',
  margin: 'auto',
  padding: '16px',
  background: 'rgba(32, 32, 32, 0.1)',
  display: 'flex',
  flexFlow: 'column',
  justifyContent: 'center',
  borderRadius: '6px',
})

const NotificationDiv = styled('div')({
  color: 'red'
})

function selectRoom(apiUrl: string, room: string, hash: string, navigate: NavigateFunction | undefined): void {
  if (window.opener && window.name === 'saml-login') {
    window.opener.postMessage({ type: 'room', room, hash }, '*')
    window.close()
    return
  }

  login(apiUrl, room, hash, false)
    .then((m: Message): void => {
      if (!isAcnOkMessage(m)) {
        const error = `Login failed: ${ isErrorMessage(m) ? m.message : JSON.stringify(m)}`
        roomsStore.setError(error)
        return
      }
      setToken(m.attrs.token)
      gotoCommentPage(navigate)
    })
}

const RoomSelectForm = ({ apiUrl, navigate, store }: {
  apiUrl: string
  navigate: NavigateFunction | undefined
  store: typeof roomsStore.snapshot
}): JSX.Element => {
  const backToLogin = useCallback((): void => {
    removeToken()
    gotoLoginPage(navigate)
  }, [navigate])

  // TODO: Change icon if anyone in the room.
  log.error(store)
  return (
    <>
      <Typography sx={{ mt: 4, mb: 0 }} variant="h6" component="div">Hi! {store.nid}.</Typography>
      <Typography sx={{ mt: 0, mb: 4 }} variant="h6" component="div">Select the room you want to join!</Typography>
      <Box sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 3 }}>
        <List>
          {store.rooms.map((room) => (
            <ListItem disablePadding key={room.room}>
              <ListItemButton onClick={(): void => { selectRoom(apiUrl, room.room, room.hash, navigate) }}>
                <ListItemIcon>
                  <SpeakerNotesRounded />
                </ListItemIcon>
                <ListItemText primary={room.room} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      <Divider sx={{ mt: 2, mb: 2 }} />
      <Grid container sx={{ width: '100%' }} alignItems="center" direction="column">
        <Grid item xs={12}>
          <Link href="#" onClick={backToLogin}>Back to login</Link>
        </Grid>
      </Grid>

    </>
  )
}

export const SelectRoom: FC<SelectRoomProps> = ({
  apiUrl,
  navigate,
}: SelectRoomProps): JSX.Element => {
  const store = useSyncExternalStore(roomsStore.subscribe, roomsStore.getSnapshot)

  useEffect((): void => {
    roomsStore.fetch(apiUrl)
  }, [apiUrl])

  return (
    <Root>
      <Form>
        {
          store.error
            ? <NotificationDiv>{store.error}</NotificationDiv>
            : <RoomSelectForm apiUrl={apiUrl} navigate={navigate} store={store} />
        }
      </Form>
    </Root>
  )
}
