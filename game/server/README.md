# Q3JS server

Combined Q3JS dedicated server and WebSocket-to-UDP gateway. The Node entry
point owns the `ioq3ded` child process, health endpoint, gateway lifecycle, and
graceful shutdown.

Build and run from the repository root:

```sh
make server
Q3JS_BASEPATH=/path/containing/baseq3 make server-run
```

The release contains `ioq3ded` and a content-addressed PK3 with `cgame.qvm`,
`qagame.qvm`, and `ui.qvm`. The server advertises and transfers that PK3 with
Quake 3's built-in download protocol; the gateway does not serve game files.

Once the game is ready, the packaged server registers its published WebSocket
address with the Q3JS master and refreshes that heartbeat every five seconds.
The master then obtains map, player, and game information through the same
WebSocket-to-UDP gateway used by browser clients.

Browser connections use `ws://localhost:27961/ws`. Native Quake traffic and
the gateway target use UDP port `27960`. `GET /healthz` reports combined
gateway and game-server readiness.

Runtime variables:

- `Q3JS_BASEPATH`: directory containing `baseq3` assets (defaults to `game/server/data`)
- `Q3JS_HOME_PATH`: writable server state (defaults to `game/server/state`)
- `Q3JS_GAME_HOST`, `Q3JS_GAME_PORT`: ioq3ded bind/target, defaults `127.0.0.1:27960`
- `Q3JS_GATEWAY_HOST`, `Q3JS_GATEWAY_PORT`: gateway bind, defaults `0.0.0.0:27961`
- `Q3JS_MASTER_URL`: master HTTP base URL, defaults `http://localhost:8080`
- `Q3JS_EVENT_URL`: authenticated event-ingestion endpoint, defaults to
  `/api/events` on `Q3JS_MASTER_URL`
- `Q3JS_EVENT_CLIENT_SECRET`: shared event-ingestion secret. Local masters use
  the same development-only fallback as the master application. It is required
  when `Q3JS_MASTER_URL` is remote; `openssl rand -hex 32` generates one. The
  server also sends it with heartbeats so matching servers are marked official.
- `Q3JS_PUBLISH_HOST`, `Q3JS_PUBLISH_PORT`: browser-reachable gateway address,
  defaults `localhost` and `Q3JS_GATEWAY_PORT`
- `Q3JS_SECURE`: publish the gateway as `wss` instead of `ws`, defaults `false`
- `Q3JS_HEARTBEAT_INTERVAL_MS`, `Q3JS_HEARTBEAT_TIMEOUT_MS`: heartbeat timing,
  defaults `5000` and `3000`
- `Q3JS_RCON_PASSWORD`: optional RCON password

Arguments passed to `game/server/run.sh` are appended to the ioq3ded command line.

## Container image

Build the combined game server and WebSocket gateway from the repository root:

```sh
docker build -f game/server/Dockerfile -t q3js-server .
```

The image does not contain proprietary Quake III data. Mount a directory that
contains `baseq3` at `/data`, and persist generated server state at `/state`:

```sh
docker run --rm \
  -p 27960:27960/udp \
  -p 27961:27961/tcp \
  -v /path/to/game-data:/data:ro \
  -v q3js-server-state:/state \
  -e Q3JS_MASTER_URL=https://master.example.com \
  -e Q3JS_EVENT_CLIENT_SECRET=replace-with-a-production-secret \
  -e Q3JS_PUBLISH_HOST=quake.example.com \
  -e Q3JS_SECURE=true \
  q3js-server
```

For a controlled deployment pipeline, `Q3JS_GAME_DATA_URL` can instead be passed
as a build argument. The builder fetches `baseq3/pak0.pk3` through
`baseq3/pak8.pk3` from that URL and seeds `/data`; the default remains empty.
