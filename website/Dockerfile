FROM emscripten/emsdk:6.0.5 AS builder

USER root
RUN apt-get update \
    && apt-get install --yes --no-install-recommends cmake curl ninja-build \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@11.2.2

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY game/client/package.json game/client/package.json
COPY game/server/package.json game/server/package.json
COPY website/package.json website/package.json
RUN pnpm install --frozen-lockfile --filter website...

COPY game/build-client.sh game/build-client.sh
COPY game/client game/client
COPY game/engine game/engine
COPY website website

ARG NEXT_PUBLIC_Q3JS_MASTER_URL=http://localhost:8080
ARG NEXT_PUBLIC_Q3JS_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_Q3JS_INSECURE_PLAY_URL=
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=G-X7L740SND7
ARG GOOGLE_SITE_VERIFICATION=
ARG Q3JS_GAME_DATA_URL=

ENV NEXT_PUBLIC_Q3JS_MASTER_URL=${NEXT_PUBLIC_Q3JS_MASTER_URL} \
    NEXT_PUBLIC_Q3JS_SITE_URL=${NEXT_PUBLIC_Q3JS_SITE_URL} \
    NEXT_PUBLIC_Q3JS_INSECURE_PLAY_URL=${NEXT_PUBLIC_Q3JS_INSECURE_PLAY_URL} \
    NEXT_PUBLIC_GA_MEASUREMENT_ID=${NEXT_PUBLIC_GA_MEASUREMENT_ID} \
    GOOGLE_SITE_VERIFICATION=${GOOGLE_SITE_VERIFICATION}

RUN ./game/build-client.sh
RUN pnpm --dir website build
RUN mkdir -p /workspace/game-data/baseq3 \
    && if [ -n "${Q3JS_GAME_DATA_URL}" ]; then \
        for archive in pak0.pk3 pak1.pk3 pak2.pk3 pak3.pk3 pak4.pk3 pak5.pk3 pak6.pk3 pak7.pk3 pak8.pk3; do \
            curl --fail --location --retry 3 \
                --output "/workspace/game-data/baseq3/${archive}" \
                "${Q3JS_GAME_DATA_URL}/baseq3/${archive}"; \
        done; \
    fi

FROM node:24-bookworm-slim AS runtime

ARG NEXT_PUBLIC_Q3JS_MASTER_URL=http://localhost:8080
ARG NEXT_PUBLIC_Q3JS_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_Q3JS_INSECURE_PLAY_URL=
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=G-X7L740SND7
ARG GOOGLE_SITE_VERIFICATION=

RUN groupadd --gid 10001 q3js \
    && useradd --uid 10001 --gid q3js --no-create-home --home-dir /opt/q3js q3js \
    && mkdir -p /data \
    && chown q3js:q3js /data

WORKDIR /opt/q3js/website

COPY --from=builder --chown=q3js:q3js /workspace/website/.next/standalone/ ./
COPY --from=builder --chown=q3js:q3js /workspace/website/.next/static ./website/.next/static
COPY --from=builder --chown=q3js:q3js /workspace/website/public ./website/public
COPY --from=builder --chown=q3js:q3js /workspace/game-data/ /data/

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    Q3JS_BASEPATH=/data \
    Q3JS_MASTER_URL=http://localhost:8080 \
    NEXT_PUBLIC_Q3JS_MASTER_URL=${NEXT_PUBLIC_Q3JS_MASTER_URL} \
    NEXT_PUBLIC_Q3JS_SITE_URL=${NEXT_PUBLIC_Q3JS_SITE_URL} \
    NEXT_PUBLIC_Q3JS_INSECURE_PLAY_URL=${NEXT_PUBLIC_Q3JS_INSECURE_PLAY_URL} \
    NEXT_PUBLIC_GA_MEASUREMENT_ID=${NEXT_PUBLIC_GA_MEASUREMENT_ID} \
    GOOGLE_SITE_VERIFICATION=${GOOGLE_SITE_VERIFICATION}

VOLUME ["/data"]
EXPOSE 3000

USER q3js
WORKDIR /opt/q3js/website/website

CMD ["node", "server.js"]
