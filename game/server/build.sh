#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
ENGINE_DIR="$PROJECT_ROOT/game/engine"
QVM_BUILD_DIR="${Q3JS_QVM_BUILD_DIR:-$PROJECT_ROOT/game/build/server-qvms}"
BUILD_DIR="${Q3JS_SERVER_BUILD_DIR:-$PROJECT_ROOT/game/build/server-webtransport}"
DIST_DIR="${Q3JS_SERVER_DIST_DIR:-$SCRIPT_DIR/dist}"
BUILD_TYPE="${Q3JS_BUILD_TYPE:-Release}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command '$1' was not found on PATH." >&2
    exit 1
  fi
}

require_command cmake
require_command emcc
require_command emcmake
require_command ninja
require_command node
require_command pnpm
require_command zip

cmake \
  -S "$ENGINE_DIR" \
  -B "$QVM_BUILD_DIR" \
  -G Ninja \
  -DCMAKE_BUILD_TYPE="$BUILD_TYPE" \
  -DBUILD_CLIENT=OFF \
  -DBUILD_SERVER=OFF \
  -DBUILD_GAME_LIBRARIES=OFF \
  -DBUILD_GAME_QVMS=ON \
  -DBUILD_RENDERER_GL1=OFF \
  -DBUILD_RENDERER_GL2=OFF \
  -DUSE_OPENAL=OFF \
  -DUSE_VOIP=OFF

cmake --build "$QVM_BUILD_DIR" --parallel

emcmake cmake \
  -S "$ENGINE_DIR" \
  -B "$BUILD_DIR" \
  -G Ninja \
  -DCMAKE_BUILD_TYPE="$BUILD_TYPE" \
  -DBUILD_CLIENT=OFF \
  -DBUILD_SERVER=ON \
  -DBUILD_GAME_LIBRARIES=OFF \
  -DBUILD_GAME_QVMS=OFF \
  -DBUILD_RENDERER_GL1=OFF \
  -DBUILD_RENDERER_GL2=OFF \
  -DUSE_OPENAL=OFF \
  -DUSE_VOIP=OFF

cmake --build "$BUILD_DIR" --parallel

rm -rf "$DIST_DIR"
pnpm --dir "$SCRIPT_DIR" build
node "$SCRIPT_DIR/scripts/package-release.mjs" \
  "$BUILD_DIR/$BUILD_TYPE" \
  "$QVM_BUILD_DIR/$BUILD_TYPE" \
  "$DIST_DIR" \
  "$SCRIPT_DIR/config/q3js-defaults.cfg"

echo "Combined server package is available in game/server/dist/"
