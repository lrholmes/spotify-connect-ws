import fetch from 'node-fetch'

const API_URL = 'https://api.spotify.com/v1'

export const getPlayerState = accessToken => {
  return new Promise((resolve, reject) => {
    fetch(`${API_URL}/me/player`, {
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      }
    })
      .then(response => {
        if (response.status === 202) {
          return resolve({})
        }
        return response
      })
      .then(r => r.json())
      .then(response => {
        if (response.error) {
          return reject(response.error.message)
        }

        resolve(response)
      })
      .catch(reject)
  })
}

export const playTrack = (accessToken, { id, ...args }) => {
  return new Promise((resolve, reject) => {
    const body = {}
    if (id) {
      body.uris = [`spotify:track:${id}`]
    } else {
      Object.keys(args).forEach(key => {
        if (args[key]) {
          body[key] = args[key]
        }
      })
    }

    fetch(`${API_URL}/me/player/play`, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
      .then(r => {
        if (r.status === 204) {
          return resolve()
        }

        return reject(r.statusText)
      })
      .catch(reject)
  })
}

export const transferPlayback = (accessToken, { id, play = false }) => {
  return new Promise((resolve, reject) => {
    const body = {
      device_ids: [id],
      play
    }
    fetch(`${API_URL}/me/player`, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
      .then(r => r.json())
      .then(response => {
        if (response.error) {
          return reject(response.error.message)
        }

        resolve(response)
      })
      .catch(reject)
  })
}

export const setPlayState = (accessToken, playState) =>
  fetch(`${API_URL}/me/player/${playState}`, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    }
  })

export const seek = (accessToken, positionMs) =>
  fetch(`${API_URL}/me/player/seek?position_ms=${positionMs}`, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    }
  })

export const nextTrack = accessToken =>
  fetch(`${API_URL}/me/player/next`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    }
  })

export const previousTrack = accessToken =>
  fetch(`${API_URL}/me/player/previous`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    }
  })

export const setVolume = (accessToken, volume) =>
  fetch(`${API_URL}/me/player/volume?volume_percent=${volume}`, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    }
  })
