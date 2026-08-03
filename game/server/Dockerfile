FROM node:24-bookworm AS builder

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        build-essential \
        cmake \
        curl \
        ninja-build \
        zip \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@11.2.2

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY game/client/package.json game/client/package.json
COPY game/server/package.json game/server/package.json
COPY website/package.json website/package.json
RUN pnpm install --frozen-lockfile --filter @q3js/server...

COPY game/engine game/engine
COPY game/server game/server
RUN ./game/server/build.sh

ARG Q3JS_GAME_DATA_URL=
RUN mkdir -p /workspace/game-data/baseq3 \
    && if [ -n "${Q3JS_GAME_DATA_URL}" ]; then \
        for archive in pak0.pk3 pak1.pk3 pak2.pk3 pak3.pk3 pak4.pk3 pak5.pk3 pak6.pk3 pak7.pk3 pak8.pk3; do \
            curl --fail --location --retry 3 \
                --output "/workspace/game-data/baseq3/${archive}" \
                "${Q3JS_GAME_DATA_URL}/baseq3/${archive}"; \
        done; \
    fi

FROM node:24-bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates libcurl4 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 q3js \
    && useradd --uid 10001 --gid q3js --no-create-home --home-dir /opt/q3js q3js \
    && mkdir -p /data /state \
    && chown q3js:q3js /data /state

WORKDIR /opt/q3js/server

COPY --from=builder --chown=q3js:q3js /workspace/game/server/dist ./
COPY --from=builder --chown=q3js:q3js /workspace/game-data/ /data/

ENV NODE_ENV=production \
    Q3JS_BASEPATH=/data \
    Q3JS_HOME_PATH=/state \
    Q3JS_GAME_HOST=0.0.0.0 \
    Q3JS_GAME_PORT=27960 \
    Q3JS_GATEWAY_HOST=0.0.0.0 \
    Q3JS_GATEWAY_PORT=27961

VOLUME ["/data", "/state"]
EXPOSE 27960/udp 27961/tcp

USER q3js

HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:27961/healthz').then(response => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["node", "app/main.mjs"]
