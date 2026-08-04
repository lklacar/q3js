FROM emscripten/emsdk:6.0.5 AS builder

USER root
RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        build-essential \
        cmake \
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
RUN pnpm --filter @q3js/server deploy --legacy --prod /workspace/server-runtime

FROM node:24-bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates libcurl4 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 q3js \
    && useradd --uid 10001 --gid q3js --no-create-home --home-dir /opt/q3js q3js \
    && mkdir -p /data/baseq3 /state \
    && chown q3js:q3js /data /state

WORKDIR /opt/q3js/server

COPY --from=builder --chown=q3js:q3js /workspace/game/server/dist ./
COPY --from=builder --chown=q3js:q3js /workspace/server-runtime/node_modules ./node_modules

ENV NODE_ENV=production \
    Q3JS_BASEPATH=/data \
    Q3JS_HOME_PATH=/state \
    Q3JS_GAME_HOST=0.0.0.0 \
    Q3JS_GAME_PORT=27960 \
    Q3JS_GATEWAY_HOST=0.0.0.0 \
    Q3JS_GATEWAY_PORT=27961

VOLUME ["/data/baseq3", "/state"]
EXPOSE 27960/udp 27961/tcp 27961/udp

USER q3js

HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:27961/healthz').then(response => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["node", "app/main.mjs"]
