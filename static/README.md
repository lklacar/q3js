# Q3JS static file server

This image serves PK3 files from a runtime volume. It never downloads or
contains Quake III game data.

Build it from the repository root:

```sh
docker build -f static/Dockerfile -t q3js-static .
```

Run it with directories containing the base game and CPMA PK3 files:

```sh
docker run --rm \
  -p 8080:8080 \
  -v /path/to/baseq3:/data/baseq3:ro \
  -v /path/to/cpma:/data/cpma:ro \
  q3js-static
```

Files are available at `http://localhost:8080/baseq3/<filename>.pk3`, and the
CPMA files are available at `http://localhost:8080/cpma/<filename>.pk3`. The
container generates `/cpma/manifest.json` from the mounted CPMA files when it
starts. The health endpoint is `http://localhost:8080/healthz`.

## Dokploy

- Build with `static/Dockerfile` and the repository root as the build context.
- Route the desired domain or both `/baseq3` and `/cpma` paths to container port `8080`.
- Attach the base game PK3 volume read-only at `/data/baseq3` and put
  `pak0.pk3` through `pak8.pk3` at its root.
- Attach the CPMA PK3 volume read-only at `/data/cpma` and put the CPMA `.pk3`
  files directly at its root.
- Mount the same volume at `/data/baseq3` in the dedicated-server container.

The server supports GET, HEAD, single byte-range requests, CORS, ETags, and
long-lived immutable caching. Directory listings and non-PK3 paths are disabled.
Restart the static container after changing the CPMA mount so its manifest is
regenerated.
