# Q3JS master server

The master server is the Q3JS game-server registry. Packaged Q3JS servers send
periodic heartbeats to it; the master queries their Quake status through the
WebSocket gateway, persists the latest successful response, and removes servers
that stop reporting.

The public API is compatible with the previous Q3JS server registry:

- `PUT /api/servers/heartbeat` registers or refreshes a server.
- `GET /api/servers` returns live servers with their latest status and players.
- `GET /api/status` reports application status.
- `GET /q/health` reports Quarkus health checks.

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
