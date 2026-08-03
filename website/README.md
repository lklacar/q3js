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
  .

docker run --rm -p 3000:3000 \
  -e Q3JS_MASTER_URL=http://master:8080 \
  -v /path/to/game-data:/data:ro \
  q3js-website
```

The mounted data directory must contain `baseq3/pak0.pk3` through
`baseq3/pak8.pk3` for the browser client asset route.

Alternatively, pass `Q3JS_GAME_DATA_URL` as a build argument to fetch those
archives into the image during a controlled deployment. The default build does
not download or bundle game data.
