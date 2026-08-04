FROM nginx:1.28-alpine

COPY static/nginx.conf /etc/nginx/nginx.conf
COPY --chmod=755 static/generate-cpma-manifest.sh /docker-entrypoint.d/40-generate-cpma-manifest.sh

RUN rm -rf /usr/share/nginx/html \
    && mkdir -p /data/baseq3 /data/cpma \
    && chown -R nginx:nginx /data /var/cache/nginx

VOLUME ["/data/baseq3", "/data/cpma"]
EXPOSE 8080

USER nginx

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
