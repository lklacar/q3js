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

Browser connections use `ws://localhost:27961/ws`. Native Quake traffic and
the gateway target use UDP port `27960`. `GET /healthz` reports combined
gateway and game-server readiness.

Runtime variables:

- `Q3JS_BASEPATH`: directory containing `baseq3` assets (defaults to `game/server/data`)
- `Q3JS_HOME_PATH`: writable server state (defaults to `game/server/state`)
- `Q3JS_GAME_HOST`, `Q3JS_GAME_PORT`: ioq3ded bind/target, defaults `127.0.0.1:27960`
- `Q3JS_GATEWAY_HOST`, `Q3JS_GATEWAY_PORT`: gateway bind, defaults `0.0.0.0:27961`
- `Q3JS_RCON_PASSWORD`: optional RCON password

Arguments passed to `game/server/run.sh` are appended to the ioq3ded command line.
