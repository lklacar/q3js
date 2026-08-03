# Q3JS master server

The master server is a Quarkus application backed by PostgreSQL. Flyway applies
the existing Q3JS schema when the application starts.

## Development

Start PostgreSQL from the repository root:

```shell
docker compose up -d database
```

Then start the master server:

```shell
cd master
./mvnw quarkus:dev
```

The API status endpoint is available at `http://localhost:8080/api/status` and
Quarkus health checks are available at `http://localhost:8080/q/health`.

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
./mvnw verify
```

Application services can inject the configured `org.jooq.DSLContext`; it uses
Quarkus's managed PostgreSQL datasource and the PostgreSQL dialect.
