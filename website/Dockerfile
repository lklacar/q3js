FROM emscripten/emsdk:6.0.5 AS builder

USER root
RUN apt-get update \
    && apt-get install --yes --no-install-recommends cmake ninja-build \
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
ARG NEXT_PUBLIC_Q3JS_STATIC_URL=
ARG NEXT_PUBLIC_Q3JS_WEBTRANSPORT_URL=
ARG NEXT_PUBLIC_Q3JS_SERVER_ADDRESS=
ARG NEXT_PUBLIC_Q3JS_WEBTRANSPORT_CERT_SHA256=
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=G-X7L740SND7
ARG GOOGLE_SITE_VERIFICATION=

ENV NEXT_PUBLIC_Q3JS_MASTER_URL=${NEXT_PUBLIC_Q3JS_MASTER_URL} \
    NEXT_PUBLIC_Q3JS_SITE_URL=${NEXT_PUBLIC_Q3JS_SITE_URL} \
    NEXT_PUBLIC_Q3JS_STATIC_URL=${NEXT_PUBLIC_Q3JS_STATIC_URL} \
    NEXT_PUBLIC_Q3JS_WEBTRANSPORT_URL=${NEXT_PUBLIC_Q3JS_WEBTRANSPORT_URL} \
    NEXT_PUBLIC_Q3JS_SERVER_ADDRESS=${NEXT_PUBLIC_Q3JS_SERVER_ADDRESS} \
    NEXT_PUBLIC_Q3JS_WEBTRANSPORT_CERT_SHA256=${NEXT_PUBLIC_Q3JS_WEBTRANSPORT_CERT_SHA256} \
    NEXT_PUBLIC_GA_MEASUREMENT_ID=${NEXT_PUBLIC_GA_MEASUREMENT_ID} \
    GOOGLE_SITE_VERIFICATION=${GOOGLE_SITE_VERIFICATION}

RUN ./game/build-client.sh
RUN pnpm --dir website build

FROM node:24-bookworm-slim AS runtime

ARG NEXT_PUBLIC_Q3JS_MASTER_URL=http://localhost:8080
ARG NEXT_PUBLIC_Q3JS_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_Q3JS_STATIC_URL=
ARG NEXT_PUBLIC_Q3JS_WEBTRANSPORT_URL=
ARG NEXT_PUBLIC_Q3JS_SERVER_ADDRESS=
ARG NEXT_PUBLIC_Q3JS_WEBTRANSPORT_CERT_SHA256=
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=G-X7L740SND7
ARG GOOGLE_SITE_VERIFICATION=

RUN groupadd --gid 10001 q3js \
    && useradd --uid 10001 --gid q3js --no-create-home --home-dir /opt/q3js q3js

WORKDIR /opt/q3js/website

COPY --from=builder --chown=q3js:q3js /workspace/website/.next/standalone/ ./
COPY --from=builder --chown=q3js:q3js /workspace/website/.next/static ./website/.next/static
COPY --from=builder --chown=q3js:q3js /workspace/website/public ./website/public

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    Q3JS_MASTER_URL=http://localhost:8080 \
    NEXT_PUBLIC_Q3JS_MASTER_URL=${NEXT_PUBLIC_Q3JS_MASTER_URL} \
    NEXT_PUBLIC_Q3JS_SITE_URL=${NEXT_PUBLIC_Q3JS_SITE_URL} \
    NEXT_PUBLIC_Q3JS_STATIC_URL=${NEXT_PUBLIC_Q3JS_STATIC_URL} \
    NEXT_PUBLIC_Q3JS_WEBTRANSPORT_URL=${NEXT_PUBLIC_Q3JS_WEBTRANSPORT_URL} \
    NEXT_PUBLIC_Q3JS_SERVER_ADDRESS=${NEXT_PUBLIC_Q3JS_SERVER_ADDRESS} \
    NEXT_PUBLIC_Q3JS_WEBTRANSPORT_CERT_SHA256=${NEXT_PUBLIC_Q3JS_WEBTRANSPORT_CERT_SHA256} \
    NEXT_PUBLIC_GA_MEASUREMENT_ID=${NEXT_PUBLIC_GA_MEASUREMENT_ID} \
    GOOGLE_SITE_VERIFICATION=${GOOGLE_SITE_VERIFICATION}

EXPOSE 3000

USER q3js
WORKDIR /opt/q3js/website/website

CMD ["node", "server.js"]
