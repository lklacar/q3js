#!/usr/bin/env bash
set -Eeuo pipefail

set -m

args=("$@")
has_fs_game_arg=false
has_killpost_client_secret_arg=false
has_rcon_password_arg=false

for ((i = 0; i < ${#args[@]} - 1; i++)); do
  if [[ "${args[$i]}" == "+set" && "${args[$((i + 1))]}" == "fs_game" ]]; then
    has_fs_game_arg=true
  fi
  if [[ "${args[$i]}" == "+set" && "${args[$((i + 1))]}" == "sv_killpost_client_secret" ]]; then
    has_killpost_client_secret_arg=true
  fi
  if [[ "${args[$i]}" == "+set" && "${args[$((i + 1))]}" == "rconPassword" ]]; then
    has_rcon_password_arg=true
  fi
done

if [[ "$has_fs_game_arg" == false ]]; then
  args=("+set" "fs_game" "${FS_GAME:-q3js}" "${args[@]}")
fi

if [[ "$has_killpost_client_secret_arg" == false && -n "${Q3JS_EVENT_CLIENT_SECRET:-}" ]]; then
  args=("+set" "sv_killpost_client_secret" "$Q3JS_EVENT_CLIENT_SECRET" "${args[@]}")
fi

if [[ "$has_rcon_password_arg" == false && -n "${RCON_PASSWORD:-}" ]]; then
  args=("+set" "rconPassword" "$RCON_PASSWORD" "${args[@]}")
fi

node ../proxy/index.js &
PROXY_PID=$!

./ioq3ded "${args[@]}" &
Q3_PID=$!

cleanup() {
  echo "Shutting down..."
  kill -TERM -$PROXY_PID 2>/dev/null || true
  kill -TERM -$Q3_PID 2>/dev/null || true
}
trap cleanup SIGINT SIGTERM

# Wait for both
wait $PROXY_PID
wait $Q3_PID
