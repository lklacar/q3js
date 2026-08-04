#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "${Q3JS_TLS_CERT_FILE:-}" && -z "${Q3JS_TLS_KEY_FILE:-}" ]]; then
  TLS_DIRECTORY="${Q3JS_HOME_PATH:-$SCRIPT_DIR/state}/tls"
  Q3JS_TLS_CERT_FILE="$TLS_DIRECTORY/cert.pem"
  Q3JS_TLS_KEY_FILE="$TLS_DIRECTORY/key.pem"
  mkdir -p "$TLS_DIRECTORY"
  if [[ ! -f "$Q3JS_TLS_CERT_FILE" || ! -f "$Q3JS_TLS_KEY_FILE" ]] \
      || ! openssl x509 -checkend 86400 -noout -in "$Q3JS_TLS_CERT_FILE" >/dev/null 2>&1; then
    openssl ecparam -name prime256v1 -genkey -noout -out "$Q3JS_TLS_KEY_FILE"
    openssl req -new -x509 \
      -key "$Q3JS_TLS_KEY_FILE" \
      -out "$Q3JS_TLS_CERT_FILE" \
      -days 13 \
      -sha256 \
      -subj /CN=localhost \
      -addext subjectAltName=DNS:localhost,IP:127.0.0.1
  fi
  export Q3JS_TLS_CERT_FILE Q3JS_TLS_KEY_FILE
  CERTIFICATE_HASH="$(openssl x509 -in "$Q3JS_TLS_CERT_FILE" -outform DER | openssl dgst -sha256 -hex | awk '{print $2}')"
  printf 'Local WebTransport certificate SHA-256: %s\n' "$CERTIFICATE_HASH"
elif [[ -z "${Q3JS_TLS_CERT_FILE:-}" || -z "${Q3JS_TLS_KEY_FILE:-}" ]]; then
  printf 'Q3JS_TLS_CERT_FILE and Q3JS_TLS_KEY_FILE must be set together.\n' >&2
  exit 1
fi

exec node "$SCRIPT_DIR/dist/app/main.mjs" "$@"
