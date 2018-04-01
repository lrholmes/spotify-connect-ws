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
  CONNECT_ERROR: 'connect_error',
  HAS_SCRUBBED_THRESHOLD: 1500,
  HAS_FINISHED_THRESHOLD: 2000,
  POLL_RATE: 1000
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

  const handleError = error => {
    const message = error.message || error
    if (message !== socket.lastSentError) {
      socket.emit(C.CONNECT_ERROR, error)
      socket.lastSentError = message
    } else {
      socket.pollRate = socket.pollRate < 5000 ? socket.pollRate + 1000 : 5000
    }
  }

  socket.on('disconnect', () => {
    socket.poll = () => {}
  })

  socket.on('initiate', ({ accessToken = null }) => {
    if (!accessToken && !socket.accessToken) {
      return socket.emit(
        C.CONNECT_ERROR,
        'An access token is required in order to start listening for playback events'
      )
    }

    socket.accessToken = accessToken
    socket.poll()
  })

  socket.poll = () => {
    getPlayerState(socket.accessToken)
      .then(playerState => {
        if (!playerState.device) {
          handleError('No active device')
          return
        }
        if (!socket.hasSentInitialState) {
          socket.emit('initial_state', playerState)
          socket.playerState = playerState
          socket.hasSentInitialState = true
          return
        }

        // reset poll rate if no errors were encountered
        socket.pollRate = C.POLL_RATE

        if (playerState.item.id !== socket.playerState.item.id) {
          // track has changed
          socket.emit('track_change', playerState.item)
          socket.hasNotifiedTrackEnd = false
        } else {
        }

        // check if the track has been scrubbed
        const negativeProgress =
          playerState.progress_ms >
          socket.playerState.progress_ms + C.HAS_SCRUBBED_THRESHOLD
        const positiveProgess =
          playerState.progress_ms <
          socket.playerState.progress_ms - C.HAS_SCRUBBED_THRESHOLD
        if (negativeProgress || positiveProgess) {
          socket.emit('seek', playerState.progress_ms, playerState.timestamp)
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
          playerState.progress_ms + C.HAS_FINISHED_THRESHOLD >
            playerState.item.duration_ms
        ) {
          socket.emit('track_end', playerState.item)
          socket.hasNotifiedTrackEnd = true
        }

        socket.playerState = playerState
      })
      .catch(handleError)

    setTimeout(socket.poll, socket.pollRate)
  }

  socket.on('play', track => {
    if (track) {
      playTrack(socket.accessToken, track).catch(handleError)
    } else {
      setPlayState(socket.accessToken, 'play').catch(handleError)
    }
  })

  socket.on('resume', () => {
    setPlayState(socket.accessToken, 'play').catch(handleError)
  })

  socket.on('pause', () => {
    setPlayState(socket.accessToken, 'pause').catch(handleError)
  })

  socket.on('seek', positionMs => {
    seek(socket.accessToken, positionMs).catch(handleError)
  })

  socket.on('set_volume', volumePercent => {
    setVolume(socket.accessToken, volumePercent).catch(handleError)
  })

  socket.on('next_track', () => {
    nextTrack(socket.accessToken).catch(e => socket.emit(C.CONNECT_ERROR, e))
  })

  socket.on('previous_track', () => {
    previousTrack(socket.accessToken).catch(handleError)
  })

  socket.on('transfer_playback', device => {
    transferPlayback(socket.accessToken, device).catch(handleError)
  })

  socket.on('access_token', accessToken => {
    socket.accessToken = accessToken
  })
}

export default spotifyConnectWs
