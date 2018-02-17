import {
  getPlayerState,
  playTrack,
  setPlayState,
  transferPlayback,
  seek,
  nextTrack,
  previousTrack,
  setVolume
} from './spotify'

const C = {
  CONNECT_ERROR: 'connect_error'
}

const spotifyConnectWs = socket => {
  socket.use((packet, next) => {
    if (packet[0] !== 'initiate') {
      if (!socket.accessToken) {
        return socket.emit(
          C.CONNECT_ERROR,
          'Access token not found: ensure to `initiate` with an access token before attempting other requests.'
        )
      }
    }
    next()
  })

  socket.on('disconnect', () => {
    clearInterval(socket.poll)
  })

  socket.on('initiate', ({ accessToken = null }) => {
    if (!accessToken && !socket.accessToken) {
      return socket.emit(
        C.CONNECT_ERROR,
        'An access token is required in order to start listening for playback events'
      )
    }

    socket.accessToken = accessToken

    getPlayerState(socket.accessToken)
      .then(playerState => {
        socket.emit('initial_state', playerState)
        socket.playerState = playerState
        socket.poll = setInterval(() => {
          getPlayerState(socket.accessToken).then(playerState => {
            if (playerState.item.id !== socket.playerState.item.id) {
              // track has changed
              socket.emit('track_change', playerState.item)
              socket.hasNotifiedTrackEnd = false
            } else {
              // track is the same, check if it has been scrubbed
              if (playerState.is_playing) {
                const negativeProgress =
                  playerState.progress_ms >
                  socket.playerState.progress_ms + 1500
                const positiveProgess =
                  playerState.progress_ms <
                  socket.playerState.progress_ms - 1500
                if (negativeProgress || positiveProgess) {
                  socket.emit(
                    'seek',
                    playerState.progress_ms,
                    playerState.timestamp
                  )
                }
              }
            }
            if (playerState.is_playing !== socket.playerState.is_playing) {
              // play state has changed
              const event = playerState.is_playing
                ? 'playback_started'
                : 'playback_paused'
              socket.emit(event)
            }
            if (playerState.device.id !== socket.playerState.device.id) {
              // device has changed
              socket.emit('device_change', playerState.device)
            } else {
              // device is the same, check volume
              if (
                playerState.device.volume_percent !==
                socket.playerState.device.volume_percent
              ) {
                // volume has changed
                socket.emit('volume_change', playerState.device.volume_percent)
              }
            }

            if (
              !socket.hasNotifiedTrackEnd &&
              playerState.progress_ms + 2000 > playerState.item.duration_ms
            ) {
              socket.emit('track_end', playerState.item)
              socket.hasNotifiedTrackEnd = true
            }

            socket.playerState = playerState
          })
        }, 1000)
      })
      .catch(e => socket.emit(C.CONNECT_ERROR, e))
  })

  socket.on('play', track => {
    if (track) {
      playTrack(socket.accessToken, track).catch(e =>
        socket.emit(C.CONNECT_ERROR, e)
      )
    } else {
      setPlayState(socket.accessToken, 'play').catch(e =>
        socket.emit(C.CONNECT_ERROR, e)
      )
    }
  })

  socket.on('resume', () => {
    setPlayState(socket.accessToken, 'play').catch(e =>
      socket.emit(C.CONNECT_ERROR, e)
    )
  })

  socket.on('pause', () => {
    setPlayState(socket.accessToken, 'pause').catch(e =>
      socket.emit(C.CONNECT_ERROR, e)
    )
  })

  socket.on('seek', positionMs => {
    seek(socket.accessToken, positionMs).catch(e =>
      socket.emit(C.CONNECT_ERROR, e)
    )
  })

  socket.on('set_volume', volumePercent => {
    setVolume(socket.accessToken, volumePercent).catch(e =>
      socket.emit(C.CONNECT_ERROR, e)
    )
  })

  socket.on('next_track', () => {
    nextTrack(socket.accessToken).catch(e => socket.emit(C.CONNECT_ERROR, e))
  })

  socket.on('previous_track', () => {
    previousTrack(socket.accessToken).catch(e =>
      socket.emit(C.CONNECT_ERROR, e)
    )
  })

  socket.on('transfer_playback', device => {
    transferPlayback(socket.accessToken, device).catch(e =>
      socket.emit(C.CONNECT_ERROR, e)
    )
  })

  socket.on('access_token', accessToken => {
    socket.accessToken = accessToken
  })
}

export default spotifyConnectWs
