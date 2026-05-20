# Q3JS

> Quake III Arena rebuilt for the web: WebAssembly client, dedicated server, and supporting services all living in one
> repo.

Q3JS compiles `ioquake3` to WebAssembly, streams the original `pak` assets through a modern React front end, tunnels UDP
traffic through a WebSocket proxy, and keeps server metadata in a Quarkus backend. You can jump straight in at
[q3js.com](https://q3js.com), or read on to see how the pieces fit together and how to work on each one locally.

## Highlights

- **Browser-native Quake 3** – the `game/` module builds `ioquake3` with Emscripten 4.0.19 and serves it through the
  Vite/TanStack app in `website/`.
- **Dedicated server + WS bridge** – the `server/` module builds `ioq3ded` and exposes it to browsers via a Node-based
  WebSocket↔UDP proxy.
- **Master/API service** – the Quarkus service listens for heartbeats on /api/servers/heartbeat, and exposes a REST API.
- **Single workspace** – scripts, Dockerfiles, and helper tooling live alongside the code so you can spin up the entire
  stack with a few commands.

## Repository map

| Path       | Description                                                                     |
|------------|---------------------------------------------------------------------------------|
| `game/`    | Emscripten build scripts that compile `ioquake3` into `ioquake3.{js,wasm}`.     |
| `server/`  | Native dedicated server build, Dockerfile, entrypoint, and WebSocket↔UDP proxy. |
| `master/`  | Quarkus app (REST master server)                                                |
| `website/` | Vite + React + TanStack Router UI that embeds the WASM build and server picker. |
| `emsdk/`   | Local Emscripten SDK checkout used by `game/build.sh`.                          |
| `ioq3/`    | Submodule pointing to the `ioquake3` source code.                               |~~~~

## Architecture

```
Browser (React + ioquake3.wasm)
    │
    ├── HTTP(S) → Quarkus Service (REST /api/servers)
    └── WebSocket → ws-udp-proxy → UDP → ioq3ded (maps, rcon, gameplay)
```

## Requirements

| Tool                    | Version / Notes                                                                               |
|-------------------------|-----------------------------------------------------------------------------------------------|
| Node.js & npm           | Node 18+ (Node 20.x recommended) for the website and ws proxy.                                |
| Java                    | JDK 21 for Quarkus.                                                                           |
| Maven                   | Included via `master/mvnw`, but installing Maven 3.9+ helps.                                  |
| Docker + Docker Compose | Required for the Postgres dev DB and optional server builds.                                  |
| CMake + build-essential | Needed to compile the native server locally.                                                  |
| Emscripten SDK          | 4.0.19 (included via `emsdk/`; run `git submodule update --init emsdk` or download manually). |
| Quake III Arena assets  | Copy your legal `pak*.pk3` files into `baseq3/` and `baseq3.zip`.                             |

> **Legal notice:** The `pak` files are free, shareware demo versions of Quake III Arena. To play the full game, you
> must own a legal copy of Quake III Arena or Quake III: Team Arena and copy the corresponding `pak` files from your
> installation.

## Quick start

1. **Acquire assets**
    - Copy the baseq3 folder into `website/public/` so the browser client can download them.

2. **Build the WebAssembly client**
   ```bash
   pushd game
   ./build.sh                   # installs/activates emsdk 4.0.19 and compiles ioquake3
   popd
   ```
   The output `game/build/Release/ioquake3.{js,wasm}` must be copied (or symlinked) into `website/src/lib/`. The script
   already patches OpenGL shaders for WebGL 2 / GLES precision requirements.

3. **Run the Quarkus service**
   ```bash
   pushd master
   ./mvnw quarkus:dev           # REST API on http://localhost:8080, UDP master on :27950
   popd
   ```
   Test the API: `curl http://localhost:8080/api/servers`.

4. **Build & run the dedicated server + proxy**
   ```bash
   pushd server
   ./build.sh                   # cmake build of ioq3ded in server/build/Release
   ./entrypoint.sh              # launches ioq3ded with the default cvars/maps
   popd
   ```
    - The proxy listens on `WS_PORT` (default `27961`) and points to `Q3_HOST:Q3_PORT` (default `127.0.0.1:27960`).
      Override via env vars when running `entrypoint.sh` or the Docker container.

5. **Run the web UI**
   ```bash
   pushd website
   npm install
   npm run dev                  # Vite dev server on http://localhost:3000
   popd
   ```
   The SPA polls the REST API for server data and opens the WebSocket proxy when you click “Play”.

## Component details

### Browser client (`game/` + `website/`)

- `game/build.sh` bootstraps Emscripten, patches GLSL shaders for precision qualifiers, and builds a Release target with
  SDL2, WebGL2, and filesystem support (`-sFORCE_FILESYSTEM=1 -lidbfs.js`).
- The generated artifacts are consumed by the React app (`website/src/lib/ioquake3.js` and `.wasm`). Persistent data
  lives in IDBFS; `GamePage.tsx` handles mounting/syncing and versioned cache invalidation.
- Tooling: Vite + Tailwind CSS, TanStack Router, TanStack Query, shadcn/ui, Vitest, and Biome for formatting/linting.
  Use `npm run test`, `npm run lint`, `npm run format`, `npm run check`.

### Dedicated server (`server/`)

- `server/build.sh` configures `ioq3ded` (headless server, QVMs enabled) via CMake/GCC, copies `baseq3/` into the build
  output, and leaves binaries in `server/build/Release/`.
- `ws-udp-proxy/index.js` converts browser WebSocket traffic to raw UDP packets understood by the Quake server.
  Environment variables:
    - `Q3_HOST`, `Q3_PORT` – native server address (defaults `127.0.0.1:27960`).
    - `WS_PORT` – listen port for browsers (`27961`).
    - `RCON_PASSWORD` – optional; passed through to the dedicated server as `rconPassword`.
    - Railgun restriction is controlled by rcon. From a client console, set `/rconPassword <password>`, then run `/rcon restrictrail` to toggle railgun use for non-admins. `/rcon restrictrail 1` and `/rcon restrictrail 0` are also supported.
    - `POLL_MS`, `RESP_TIMEOUT_MS`, `CONSEC_REQUIRED` – tune heartbeat/kick behaviour.
- `entrypoint.sh` launches both the proxy and `ioq3ded` with sensible defaults (dedicated server, `q3dm17`). Use the
  multi-stage `server/Dockerfile` if you prefer container builds: `docker build -t q3js/server ./server`.

### Master/API service (`master/`)

- Built with Quarkus 3.29 (Jakarta EE 10 APIs), exposes `GET /api/servers` returning `ServerResponse` DTOs.
- Admin auth uses `Q3JS_ADMIN_PASSWORD` for login and `Q3JS_ADMIN_JWT_SECRET` to sign admin JWTs. Generate a stable JWT
  secret with `openssl rand -base64 32` and set it as `Q3JS_ADMIN_JWT_SECRET`.
- Tests: `./mvnw test`. Native builds: `./mvnw package -Dnative`.

## Running everything with Docker

- **Server:** `docker build -t q3js/server ./server && docker run --rm -p 27960:27960/udp -p 27961:27961 q3js/server`.
  Mount `baseq3/` if you do not bake assets into the image.
- **Website:** `docker build -t q3js/website ./website` (Dockerfile provided), or deploy the static `dist/` folder
  produced by `npm run build`.

## Run your own server

- Want to customize game types, maps, or run a persistent instance? Follow the hosted guide at
  [q3js.com/guide](https://q3js.com/guide) for detailed steps on provisioning assets, configuring the Quarkus master,
  and exposing the WebSocket proxy.
- The guide walks through the Docker-based deployments.

## Useful scripts

| Command           | Purpose                                                                                                        |
|-------------------|----------------------------------------------------------------------------------------------------------------|
| `game/build.sh`   | Full WebAssembly rebuild (deletes `game/build/`). Accepts `EMSDK_ROOT`, `BASEQ3_SRC`, `BUILD_DIR`, `WEB_PORT`. |
| `server/build.sh` | Native server rebuild. Set `BASEQ3_SRC`/`BUILD_DIR` to override defaults.                                      |

## Troubleshooting

- **Browser shows black screen:** Ensure `website/src/lib/ioquake3.{js,wasm}` matches the latest build and that the
  files are referenced by Vite (restart `npm run dev` after copying).
- **`emsdk_env.sh not found`:** Set `EMSDK_ROOT=/path/to/emsdk` before running `game/build.sh`.

## License & credits

- Engine source is derived from [ioquake3](https://github.com/ioquake/ioq3) (GPLv2). See `ioq3/`.
- Game assets remain © id Software / Bethesda. Supply your own `baseq3` data.
- New code in this repository is licensed under the same terms as the respective sub-projects unless noted otherwise.
- The WebSocket proxy and integration glue were developed by
  [lklacar](https://github.com/lklacar); please provide attribution if you reuse these components.
- The `q3js.com` website and its original content are likewise authored and owned by lklacar; include proper credit when
  referencing or republishing any portion of it.

Happy fragging! Feel free to open issues or PRs with improvements to the stack.
