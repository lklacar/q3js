FROM node:20-trixie AS proxybuilder

WORKDIR /
COPY . .
WORKDIR /proxy

RUN npm install


FROM debian:latest AS serverbuilder

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libcurl4-openssl-dev \
    unzip \
    pkg-config && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /
COPY . .

WORKDIR /server
RUN chmod +x build.sh && ./build.sh


FROM node:20-trixie AS runner

ENV RCON_PASSWORD=""
ENV FS_GAME=""

RUN apt-get update && apt-get install -y \
    libcurl4 \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY --from=proxybuilder /proxy /proxy

COPY --from=serverbuilder /server/build/Release /server
COPY --from=serverbuilder /server/entrypoint.sh /server/entrypoint.sh

RUN mkdir -p /server/q3js && cp -a /server/baseq3/. /server/q3js/
RUN printf 'seta sv_killpost_url "https://master.q3js.com/api/events"\n' > /server/q3js/q3js-defaults.cfg

WORKDIR /server

VOLUME ["/server/baseq3"]

EXPOSE 27961
EXPOSE 27960/udp

ENTRYPOINT ["./entrypoint.sh"]
CMD ["+set", "dedicated", "2", "+set", "sv_pure", "0", "+set", "sv_allowDownload", "1", "+set", "net_ip", "0.0.0.0", "+set", "sv_dlrate", "0", "+set", "com_hunkMegs", "256", "+exec", "q3js-defaults.cfg", "+exec", "autoexec.cfg"]
