# WebSockets for Spotify Connect API

A Socket.IO plugin that enables interfacing with Spotify's Connect API using WebSockets.

The advantage of using this package is that it takes away the need for client-side polling (and diffing). By connecting the client to the server with WebSockets, the server will handle all of the polling and diffing, and the client will simply be notified whenever there is a change to the state of the player. This makes the client side code a lot cleaner and simpler.

It should be noted that this project does not fully solve the problems discussed in [this issue](https://github.com/spotify/web-api/issues/492), in that there is still polling taking place (one request per second right now) and therefore hitting rate limits is a possibility. If you do hit the rate limit using this plugin, please let me know how many concurrent users caused it, because I would like to integrate functionality that automatically throttles the poll rate based on the number of concurrent websocket connections.

### Usage

This package has been developed to work with an Express + Socket.IO server environment.

If you want to skip the server setup and go straight to working with your app, use this testing url in the meantime: https://spotify-connect-ws.herokuapp.com/connect

Server:

```bash
npm install spotify-connect-ws --save
# or
yarn add spotify-connect-ws
```

```js
import express from 'express'
import socketio from 'socket.io'
import connectSocket from 'spotify-connect-ws'

const app = express()
const server = app.listen(process.env.PORT || 3001)

const io = socketio(server)
io.of('connect').on('connection', connectSocket)
```

Client:

```bash
npm install socket.io-client --save
# or
yarn add socket.io-client
```

```js
import openSocket from 'socket.io-client'
const io = openSocket('/connect')
// or if using testing url
const io = openSocket('https://spotify-connect-ws.herokuapp.com/connect')

io.emit('initiate', { accessToken: 'access token' })
```

### How it works

To start watching the player for changes, use `io.emit('initiate', { accessToken })`. If successful, the first event receieved by the client, named `initial_state` will provide the full Player object from Spotify. You should use this to set up any views or state needed for your app. After this event, your client will receive events based on changes to the Player's state (e.g. playback paused, track changed). All of these events are listed below.

### Events

#### Received Events

These events are used in combination with `on()` to receive changes to the player state.

Example:

```js
io.on('track_change', track => {
  // update state/store with new track
})
```

`initial_state`: This event is received once, after initiating the connection. It contains the full Player object.

`connect_error`: Any errors encountered on the server will be sent back to the client here.

`track_change`: Received after a track change is detected, along with the Spotify Track object for the new track.

`playback_started`: Indicates playback starting (both when a new track starts and when a paused track resumes playback)

`playback_paused`

`device_change`: A change to the active playback device has occured. The new Device is sent back with this event.

`volume_change`: Volume has been changed - the volume percent is sent back.

`track_end`: The current track has ended. This event is detected on the serverside by checking if the track is has less than two seconds of playback remaining. This is reliable in my testing, but there is probably a better way of checking for track end.

#### Sent Events

These are used to trigger playback events.

Example:

```js
io.emit('play', { id: '5Y17vKO1JtfnxIlM4vNQT6' })
```

`initiate`: Accepts an object with required `accessToken` parameter. This event begins watching the player state and is required before using any of the other events.

`play`: This event accepts an optional object representing the parameters for the Connect API (`uris`, `context_uri`, `offset`), but additionally accepts `id`, representing a Spotify Track ID, that will play that track. If no object is provided, the server will attempt to `resume` playback.

`resume`: Resume playback.

`pause`: Pause playback.

`seek`: Seek to position provided as argument (target position in milliseconds).

`next_track`: Skip to next track in queue

`previous_track`: Go to previous track in play history

`set_volume`: Set volume to integer representing percentage provided as argument

`transfer_playback`: Transfer playback to another device, accepts an object with following params: `id`, the device ID, and `play`, which defaults to `false` but if `true` will force playback on the new device.

`access_token`: This will set the socket's access token. If you are refreshing your token, ensure to send this event after.

### Contributing

Please contribute with any changes or fixes you'd like to see! Especially if you have any experience with Socket.IO, I'm sure that I've probably made some mistakes here or there.

Some things that I would like to add soon:

* The rest of the Player options (shuffle, repeat)
* Tests
* The ability to manage devices (events for new devices detected)

Longer term, it might be possible to dynamically adjust the poll time when there are more users connected, but first we'll need to know at what point rate limits become an issue.
