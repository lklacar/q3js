#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

ENGINE_DIR="$SCRIPT_DIR/engine"
BUILD_DIR="${Q3JS_CLIENT_BUILD_DIR:-$SCRIPT_DIR/build/client}"
DIST_DIR="${Q3JS_CLIENT_DIST_DIR:-$SCRIPT_DIR/dist/client}"
BUILD_TYPE="${Q3JS_BUILD_TYPE:-Release}"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command '$1' was not found on PATH." >&2
    exit 1
  fi
}

require_command emcc
require_command emcmake
require_command cmake
require_command ninja
require_command pnpm

echo "Building the Q3JS client with $(emcc --version | head -n 1)"

emcmake cmake \
  -S "$ENGINE_DIR" \
  -B "$BUILD_DIR" \
  -G Ninja \
  -DCMAKE_BUILD_TYPE="$BUILD_TYPE" \
  -DBUILD_CLIENT=ON \
  -DBUILD_SERVER=OFF \
  -DBUILD_GAME_LIBRARIES=OFF \
  -DBUILD_GAME_QVMS=OFF \
  -DBUILD_RENDERER_GL1=OFF \
  -DBUILD_RENDERER_GL2=ON \
  -DUSE_RENDERER_DLOPEN=OFF \
  -DUSE_OPENAL=OFF \
  -DUSE_VOIP=OFF

cmake --build "$BUILD_DIR" --parallel

OUTPUT_DIR="$BUILD_DIR/$BUILD_TYPE"
ARTIFACTS=(
  ioquake3.js
  ioquake3.wasm
  ioquake3.html
  ioquake3-config.json
)

for artifact in "${ARTIFACTS[@]}"; do
  if [[ ! -f "$OUTPUT_DIR/$artifact" ]]; then
    echo "Expected build artifact '$OUTPUT_DIR/$artifact' was not produced." >&2
    exit 1
  fi
done

cmake -E make_directory "$DIST_DIR"

for artifact in "${ARTIFACTS[@]}"; do
  cmake -E copy_if_different "$OUTPUT_DIR/$artifact" "$DIST_DIR/$artifact"
done

Q3JS_RUNTIME_SOURCE_DIR="$DIST_DIR" pnpm --dir "$SCRIPT_DIR/client" build

echo "Client package is available in game/client/dist/"
