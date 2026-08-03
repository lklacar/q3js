# Q3JS website

The Next.js website discovers live game servers through the Q3JS master server and launches the browser client against the selected server's WebSocket gateway.

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

## Checks

```bash
pnpm --dir website lint
pnpm --dir website build
```
