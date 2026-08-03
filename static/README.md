# Q3JS static file server

This image serves PK3 files from a runtime volume. It never downloads or
contains Quake III game data.

Build it from the repository root:

```sh
docker build -f static/Dockerfile -t q3js-static .
```

Run it with a directory containing PK3 files:

```sh
docker run --rm \
  -p 8080:8080 \
  -v /path/to/baseq3:/data/baseq3:ro \
  q3js-static
```

Files are available at `http://localhost:8080/baseq3/<filename>.pk3`, and the
health endpoint is `http://localhost:8080/healthz`.

## Dokploy

- Build with `static/Dockerfile` and the repository root as the build context.
- Route the desired domain or `/baseq3` path to container port `8080`.
- Attach the PK3 volume read-only at `/data/baseq3`.
- Put `pak0.pk3` through `pak8.pk3` at the root of that volume.
- Mount the same volume at `/data/baseq3` in the dedicated-server container.

The server supports GET, HEAD, single byte-range requests, CORS, ETags, and
long-lived immutable caching. Directory listings and non-PK3 paths are disabled.
