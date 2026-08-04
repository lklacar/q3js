# Q3JS static file server

This image serves PK3 files from a runtime volume. It never downloads or
contains Quake III game data.

Build it from the repository root:

```sh
docker build -f static/Dockerfile -t q3js-static .
```

Run the manifest-generator check with:

```sh
sh static/test/generate-manifests.test.sh
```

Mount one data directory containing the base game and any mod directories:

```sh
docker run --rm \
  -p 8080:8080 \
  -v /path/to/data:/data:ro \
  q3js-static
```

Organize the mounted directory by Quake filesystem game name:

```text
data/
├── baseq3/
│   ├── pak0.pk3
│   └── ...
├── cpma/
│   └── z-cpma-pak153.pk3
└── osp/
    └── osp-pak0.pk3
```

Every safe first-level directory is exposed using the same contract. PK3 files
are available at `/<game>/<filename>.pk3`, and the container generates
`/<game>/manifest.json` when it starts. For example, OSP is exposed at
`/osp/manifest.json` and `/osp/osp-pak0.pk3`. The health endpoint is
`http://localhost:8080/healthz`.

## Dokploy

- Build with `static/Dockerfile` and the repository root as the build context.
- Route the desired static domain or all game paths to container port `8080`.
- Attach one read-only volume at `/data`.
- Put base game PK3s in `/data/baseq3` and each mod's PK3s in a directory whose
  name matches its `fs_game`, such as `/data/cpma` or `/data/osp`.
- If the dedicated server shares this data, mount the appropriate subdirectory
  (for example the volume's `baseq3` directory) at its expected game-data path.

The server supports GET, HEAD, single byte-range requests, CORS, ETags, and
long-lived immutable caching. Directory listings and non-PK3 paths are disabled.
Game directory names and PK3 filenames are restricted to URL-safe Quake names.
Restart the static container after changing `/data` so its manifests are
regenerated.
