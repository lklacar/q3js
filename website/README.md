# Q3JS website

The Next.js website discovers live game servers through the Q3JS master server and launches the browser client against the selected server's WebSocket gateway. TanStack Query owns browser-side server state, caching, request cancellation, and background refreshes.

## Development

From the repository root, start each process in its own terminal:

```bash
docker compose up -d database
make master-run
make server-run
pnpm --dir website dev
```

Then open [http://localhost:3000](http://localhost:3000). The game server sends heartbeats to the master, so it should appear in the server browser automatically.

Copy `.env.example` to `.env.local` to override local endpoints. `NEXT_PUBLIC_Q3JS_MASTER_URL` selects the HTTP master API. In a production HTTPS deployment, `NEXT_PUBLIC_Q3JS_INSECURE_PLAY_URL` can point insecure game servers at a separate HTTP play page so browsers do not reject their `ws://` connection as mixed content.

## SEO and analytics

Set `NEXT_PUBLIC_Q3JS_SITE_URL` to the public canonical origin. It is used for
canonical URLs, Open Graph metadata, structured data, `robots.txt`, and the
generated sitemap. `NEXT_PUBLIC_GA_MEASUREMENT_ID` defaults to the existing Q3JS
Google Analytics property, while `GOOGLE_SITE_VERIFICATION` optionally adds the
Google Search Console verification meta tag.

The sitemap includes every player profile known to the master server. Keep
`Q3JS_MASTER_URL` configured with a server-reachable API URL in production so
Next.js can populate those entries during sitemap requests.

### Play analytics event contract

The browser emits a privacy-safe lifecycle through GA4:

- `server_join_submitted`: join intent, entry point, selected server/mode/map,
  and visible human-player count.
- `game_launch_started`: a new play attempt.
- `game_asset_milestone`: manifest start/ready, cached assets, and 25/50/75/100
  percent download thresholds.
- `game_load_phase`: engine, filesystem, asset, startup, and ready phase timing.
- `game_launch_ready`: the WebAssembly client is initialized.
- `game_connected`: the Quake engine has reached `CA_ACTIVE` on the server.
- `game_launch_error`: stable error code and phase; raw error messages are never
  sent to analytics.
- `game_play_heartbeat`: emitted every 60 seconds after connection.
- `game_disconnected`: a real `CA_DISCONNECTED` transition or explicit exit,
  including connected duration.
- `game_session_ended`: terminal event for every attempt, including attempts
  that end before connection.

Every event receives a random local-storage anonymous user ID, a tab-scoped
session ID, a per-attempt play session ID, client timestamp, page visibility,
and server context. A one-time `join_handoff_id` correlates a homepage join with
the `/play` lifecycle even when the insecure play page is on another origin.
Player names and raw errors are deliberately excluded. Page-exit events request
beacon transport.

High-cardinality IDs should remain raw export fields rather than GA4 custom
dimensions. Register only low-cardinality fields such as `load_phase`,
`asset_milestone`, `error_code`, `end_reason`, `server_mode`, and
`join_entry_point` for GA4 UI reporting. Raw retention and concurrency analysis
requires a GA4 BigQuery export or another event-level sink; the existing daily
Fivetran aggregate reports cannot reconstruct user/session paths.

## Master API client

The master API types, client functions, and TanStack Query options are generated
from the master's OpenAPI document. Run this from the `website` directory:

```bash
npm run api:generate
```

The command first builds the master and writes its OpenAPI document to
`master/target/openapi/openapi.json`, then generates the committed client under
`website/lib/api/generated`. Do not edit generated files by hand; update the
master DTO or endpoint annotations and run the command again.

## Checks

```bash
pnpm --dir website lint
pnpm --dir website build
```

## Container image

The website image builds both the Emscripten game client and the standalone
Next.js server. Public `NEXT_PUBLIC_*` values are compiled into the browser
bundle, so pass production values as build arguments:

```sh
docker build -f website/Dockerfile -t q3js-website \
  --build-arg NEXT_PUBLIC_Q3JS_MASTER_URL=https://master.example.com \
  --build-arg NEXT_PUBLIC_Q3JS_SITE_URL=https://q3js.example.com \
  --build-arg NEXT_PUBLIC_Q3JS_STATIC_URL=https://static.q3js.example.com \
  .

docker run --rm -p 3000:3000 \
  -e Q3JS_MASTER_URL=http://master:8080 \
  q3js-website
```

The website image never downloads, contains, or serves proprietary Quake III
data. Build `static/Dockerfile`, mount the PK3 volume into that container, and
set `NEXT_PUBLIC_Q3JS_STATIC_URL` to its public origin. This public value is
compiled into the browser bundle, so pass it as a build argument and rebuild
when it changes. Mount one directory at `/data`, put base assets under
`/data/baseq3`, and put each mod under the directory matching its `fs_game`
(for example `/data/cpma` or `/data/osp`). The static container generates a
manifest for every safe first-level game directory, and the browser client
loads manifests and PK3s from the configured static origin.
