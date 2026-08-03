#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
GAME_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
RUNTIME_SOURCE_DIR="${Q3JS_RUNTIME_SOURCE_DIR:-$GAME_DIR/dist/client}"
RUNTIME_DIST_DIR="$SCRIPT_DIR/dist/runtime"

for artifact in ioquake3.js ioquake3.wasm; do
  if [[ ! -f "$RUNTIME_SOURCE_DIR/$artifact" ]]; then
    echo "Missing '$RUNTIME_SOURCE_DIR/$artifact'. Run 'make client' from the project root." >&2
    exit 1
  fi
done

rm -rf "$SCRIPT_DIR/dist"
pnpm exec tsc --project "$SCRIPT_DIR/tsconfig.json"

node "$SCRIPT_DIR/scripts/prepare-runtime.mjs" "$RUNTIME_SOURCE_DIR" "$RUNTIME_DIST_DIR"
