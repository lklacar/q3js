# Q3JS master server

The master server is the Q3JS game-server registry. Packaged Q3JS servers send
periodic heartbeats to it; the master queries their Quake status through the
WebSocket gateway, persists the latest successful response, and removes servers
that stop reporting.

The public API is compatible with the previous Q3JS server registry:

- `PUT /api/servers/heartbeat` registers or refreshes a server.
- `GET /api/servers` returns live servers with their latest status and players.
- `GET /api/status` reports application status.
- `POST /api/events` accepts authenticated join, leave, and kill events from
  packaged game servers.
- `GET /api/players` searches player profiles by Quake handle.
- `GET /api/players/{playerName}` returns detailed player statistics.
- `GET /api/stats` returns players online, the top fragger from the rolling last
  24 hours, and the all-time recorded frag count.
- `GET /q/health` reports Quarkus health checks.
- `GET /q/openapi` returns the generated OpenAPI document.
- `GET /q/swagger-ui` opens the interactive Swagger UI.

Swagger UI is included in packaged builds as well as development mode.
Building the master also writes `target/openapi/openapi.json` and
`target/openapi/openapi.yaml`; the website uses the JSON document to generate its
typed API client and TanStack Query options.

Profile statistics can be filtered with `period=daily|weekly|monthly|all-time`.
Weekly and monthly boundaries use the optional IANA `timeZone` query parameter;
UTC is used by default.

## Development

Start PostgreSQL from the repository root:

```shell
docker compose up -d database
```

Then start the master server from the repository root:

```shell
make master-run
```

Run a packaged Q3JS server separately with `make server-run`. Its local defaults
publish `localhost:27961` to this master at `http://localhost:8080`.

Event ingestion requires the `X-Q3JS-Client-Secret` header. The master in dev
or test mode and a packaged server targeting localhost share a development-only
fallback. A deployed master requires an explicit secret; generate one and
provide the same value to both processes:

```shell
export Q3JS_EVENT_CLIENT_SECRET="$(openssl rand -hex 32)"
```

The game server posts to `/api/events` on `Q3JS_MASTER_URL` by default. Override
that endpoint independently with `Q3JS_EVENT_URL`.

Servers are refreshed every five seconds. A failed status query retains the last
successful response, while a missing heartbeat removes the server after five
minutes. These values are configured with `q3js.master.refresh-every`,
`q3js.master.prune-every`, `q3js.master.heartbeat-ttl`, and
`q3js.master.server-status-timeout`.

## jOOQ code generation

jOOQ generates records, POJOs, tables, keys, and sequences from the migrated
development database on demand:

```shell
./mvnw jooq-codegen:generate
```

Generated classes use the `com.q3js.master.database.generated` package and are
written under `src/main/java/com/q3js/master/database/generated`; they should be
committed with the migration that changed them. The development database must
be running and migrated before generation. Override the code-generation connection
when needed with:

```shell
./mvnw jooq-codegen:generate \
  -Djooq.codegen.jdbc.url=jdbc:postgresql://localhost:5432/postgres \
  -Djooq.codegen.jdbc.user=postgres \
  -Djooq.codegen.jdbc.password=postgres
```

The local defaults are `postgres` for the database, user, and password. Override
them with `Q3JS_DB_URL`, `Q3JS_DB_USER`, and `Q3JS_DB_PASSWORD`.

## Build

```shell
make master
```

Application services can inject the configured `org.jooq.DSLContext`; it uses
Quarkus's managed PostgreSQL datasource and the PostgreSQL dialect.
