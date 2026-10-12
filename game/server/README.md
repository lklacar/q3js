# Q3JS server

Q3JS dedicated server with native WebSocket and UDP transports. Browser game
packets go directly to `ioq3ded`; Node supervises the child process, registers
it with the master, synchronizes IP bans, and reports accepted player connections
over a private inherited control descriptor. Packaged supervision runs on Linux
and macOS. The native engine can also run independently without the supervisor.

Build and run from the repository root:

```sh
make server
Q3JS_BASEPATH=/path/containing/baseq3 make server-run
```

The release contains `ioq3ded` and a content-addressed PK3 with `cgame.qvm`,
`qagame.qvm`, and `ui.qvm`. The server advertises and transfers that PK3 with
Quake 3's built-in download protocol over either transport.

Once the game is ready, the packaged server registers its published WebSocket
address with the Q3JS master and refreshes that heartbeat every five seconds.
The master then obtains map, player, and game information through the same
native WebSocket listener used by browser clients.

Browser connections use `ws://localhost:27961/ws` (also available at `/`).
Native Quake traffic uses UDP port `27960`. The engine serves `GET /healthz`
on the WebSocket port and accepts browser connections after game readiness
and the supervisor's initial ban snapshot. The existing health JSON fields remain
compatible. TLS for `wss://` stays at your reverse proxy.

The build fetches and statically links libwebsockets 4.3.5 with a pinned SHA-256;
its license ships in `dist/licenses`. No WebSocket library is needed at runtime.
For an offline build, configure CMake with
`-DFETCHCONTENT_SOURCE_DIR_LIBWEBSOCKETS=/path/to/libwebsockets-4.3.5`.

When launching `ioq3ded` directly, set `net_wsPort` to enable the listener
(default `0`, disabled). Other transport cvars are `net_wsHost`,
`net_wsMaxConnections`, `net_wsMaxPacketBytes`, `net_wsIdleTimeoutMs`, and
`net_wsTrustedProxyHops`. Standalone launches retain local engine bans but do
not synchronize master bans or report connections without the Node supervisor.
Incoming packets are bounded by the smaller of the configured limit and the
engine's 16 KiB message limit; send queues are bounded to 1 MB per connection.
Slow clients are disconnected rather than blocking the game loop.

Runtime variables:

- `Q3JS_BASEPATH`: directory containing `baseq3` assets (defaults to `game/server/data`)
- `Q3JS_HOME_PATH`: writable server state (defaults to `game/server/state`)
- `Q3JS_GAME_HOST`, `Q3JS_GAME_PORT`: ioq3ded bind/target, defaults `127.0.0.1:27960`
- `Q3JS_GATEWAY_HOST`, `Q3JS_GATEWAY_PORT`: native WebSocket bind, defaults `0.0.0.0:27961`
- `Q3JS_TRUST_PROXY_HOPS`: trusted reverse proxies in front of the listener,
  defaults to `0`. Set to `1` behind Cloudflare (or one trusted TLS proxy),
  with direct access to the listener restricted to that proxy, so player
  connection records use the original address from `X-Forwarded-For`.
- `Q3JS_MASTER_URL`: master HTTP base URL, defaults `http://localhost:8080`
- `Q3JS_EVENT_URL`: authenticated event-ingestion endpoint, defaults to
  `/api/events` on `Q3JS_MASTER_URL`
- `Q3JS_BAN_REFRESH_INTERVAL_MS`: ban-list refresh interval, defaults to `10000`.
  When a refresh adds a connected player's address, the engine immediately
  disconnects that player.
- `Q3JS_EVENT_CLIENT_SECRET`: optional shared ingestion secret. Local
  development uses the same fallback as the master application. Community
  servers omit it: they register as unofficial and event/player-connection
  reporting and ban synchronization are disabled. Project-managed servers
  provide the master application's secret to enable authenticated reporting,
  ban enforcement, and official status.
  `openssl rand -hex 32` generates a suitable secret for operators running
  their own master.
- `Q3JS_PUBLISH_HOST`, `Q3JS_PUBLISH_PORT`: browser-reachable WebSocket address,
  defaults `localhost` and `Q3JS_GATEWAY_PORT`
- `Q3JS_SECURE`: publish the listener as `wss` instead of `ws`, defaults `false`
- `Q3JS_HEARTBEAT_INTERVAL_MS`, `Q3JS_HEARTBEAT_TIMEOUT_MS`: heartbeat timing,
  defaults `5000` and `3000`
- `Q3JS_RCON_PASSWORD`: optional RCON password
- `Q3JS_SERVER_CONFIG`: complete ioq3 server config. When set, it replaces the
  bundled `q3js-defaults.cfg` and `autoexec.cfg`; include a `map` command.

Arguments passed to `game/server/run.sh` are appended to the ioq3ded command line.

## Container image

Build the game server with native WebSockets from the repository root:

```sh
docker build -f game/server/Dockerfile -t q3js-server .
```

The image never downloads or contains proprietary Quake III data. Mount the
directory containing `pak0.pk3` through `pak8.pk3` at `/data/baseq3`, and
persist generated server state at `/state`:

```sh
docker run --rm \
  -p 27960:27960/udp \
  -p 27961:27961/tcp \
  -v /path/to/baseq3:/data/baseq3:ro \
  -v q3js-server-state:/state \
  -e Q3JS_MASTER_URL=https://master.q3js.com \
  -e Q3JS_PUBLISH_HOST=YOUR_PUBLIC_IP_OR_HOSTNAME \
  -e Q3JS_PUBLISH_PORT=27961 \
  -e Q3JS_SECURE=false \
  -e 'Q3JS_SERVER_CONFIG=seta sv_hostname "Q3JS Arena"; seta sv_maxclients "16"; seta g_gametype "0"; seta fraglimit "20"; seta timelimit "15"; map q3dm17' \
  lukaklacar/q3js-server:1.0.0
```

This public example registers an unofficial community server. Operators of the
Q3JS production master add `Q3JS_EVENT_CLIENT_SECRET` separately; community
operators do not need or receive that private credential.

In Dokploy, attach the PK3 volume to `/data/baseq3`. The PK3 files must be at
the root of that volume; no build arguments or download URLs are required.
Put the full Quake config in a single `Q3JS_SERVER_CONFIG` environment entry;
commands may be separated with semicolons or literal newlines.

## Verification

`pnpm --dir game/server test` checks configuration, registration, bans, and
reporting. Native integration tests additionally run when the compiled server,
packaged QVMs, and local `game/server/data/baseq3/pak0.pk3` are present.
Use `Q3JS_TEST_SERVER_BINARY` and `Q3JS_TEST_BASEPATH` to select another binary
and asset directory. They cover readiness, WebSocket and UDP clients sharing
an IP and qport, reconnects, reporting, IPv4/IPv6 bans, fragmented messages,
packet and connection limits, idle timeouts, and shutdown.
