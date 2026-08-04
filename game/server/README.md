# Q3JS server

The packaged server runs `ioq3ded` as Node.js + WebAssembly and terminates
HTTP/3 WebTransport directly inside that engine process. Browser Quake packets
travel as unreliable WebTransport datagrams; there is no WebSocket service and
no WebTransport-to-UDP forwarding process.

The same engine socket also accepts ordinary Quake UDP traffic, so native
clients and the master status checker remain compatible.
The server heartbeat declares `transport: "webtransport"`, allowing the browser
to distinguish it from community servers that still use the legacy WebSocket
gateway.

Build and run from the repository root:

```sh
make server
Q3JS_BASEPATH=/path/containing/baseq3 make server-run
```

For local development, `server-run` creates a short-lived ECDSA certificate in
the ignored state directory and prints its SHA-256 fingerprint. Pass that hash
to the browser client with `serverCertificateHashes`. Production deployments
should use a publicly trusted certificate.

Network endpoints:

- `27960/udp`: native Quake III traffic and master status queries
- `27961/udp`: direct HTTP/3 WebTransport at `https://host:27961/wt`
- `27961/tcp`: plain HTTP `GET /healthz` for container health checks

Local clients can read the public development-certificate fingerprint from
`GET /webtransport.json`; the endpoint includes permissive CORS and no secrets.

The release also contains a content-addressed PK3 with `cgame.qvm`,
`qagame.qvm`, and `ui.qvm`. Quake III's built-in download protocol transfers
that package; the health endpoint does not serve game files.

Runtime variables:

- `Q3JS_BASEPATH`: directory containing `baseq3` assets (defaults to `game/server/data`)
- `Q3JS_HOME_PATH`: writable server state (defaults to `game/server/state`)
- `Q3JS_GAME_HOST`, `Q3JS_GAME_PORT`: native UDP bind, defaults `127.0.0.1:27960`
- `Q3JS_GATEWAY_HOST`, `Q3JS_GATEWAY_PORT`: WebTransport UDP and health HTTP bind,
  defaults `0.0.0.0:27961` (the legacy variable names are retained for deployment compatibility)
- `Q3JS_TLS_CERT_FILE`, `Q3JS_TLS_KEY_FILE`: PEM certificate chain and private key;
  both are required by the packaged entry point
- `Q3JS_ALLOWED_ORIGINS`: comma-separated browser origins allowed to connect,
  defaults to `*`
- `Q3JS_WEBTRANSPORT_MAX_DATAGRAM_BYTES`: maximum framed datagram size, defaults `1000`
- `Q3JS_MAX_CONNECTIONS`: maximum concurrent WebTransport sessions, defaults `128`
- `Q3JS_MASTER_URL`: master HTTP base URL, defaults `http://localhost:8080`
- `Q3JS_EVENT_URL`: authenticated event endpoint, defaults to `/api/events` on the master
- `Q3JS_EVENT_CLIENT_SECRET`: shared event secret; required when the event URL is remote
- `Q3JS_PUBLISH_HOST`, `Q3JS_PUBLISH_PORT`: browser-reachable WebTransport address,
  defaults `localhost` and `Q3JS_GATEWAY_PORT`
- `Q3JS_RCON_PASSWORD`: optional RCON password
- `Q3JS_SERVER_CONFIG`: complete ioq3 server config; include a `map` command

Arguments passed to `game/server/run.sh` are appended to the ioq3ded command line.

## Container image

Build from the repository root:

```sh
docker build -f game/server/Dockerfile -t q3js-server .
```

Mount licensed Quake data plus your TLS certificate and key, and publish both
UDP ports:

```sh
docker run --rm \
  -p 27960:27960/udp \
  -p 27961:27961/udp \
  -p 27961:27961/tcp \
  -v /path/to/baseq3:/data/baseq3:ro \
  -v /path/to/tls:/tls:ro \
  -v q3js-server-state:/state \
  -e Q3JS_TLS_CERT_FILE=/tls/fullchain.pem \
  -e Q3JS_TLS_KEY_FILE=/tls/privkey.pem \
  -e Q3JS_MASTER_URL=https://master.example.com \
  -e Q3JS_EVENT_CLIENT_SECRET=replace-with-a-production-secret \
  -e Q3JS_PUBLISH_HOST=quake.example.com \
  -e 'Q3JS_SERVER_CONFIG=seta sv_hostname "Q3JS Arena"; seta sv_maxclients "16"; map q3dm17' \
  q3js-server
```

The certificate must cover `Q3JS_PUBLISH_HOST`. Ensure UDP `27961` is permitted
through the host firewall and cloud security rules; opening only TCP is not
enough for HTTP/3.
