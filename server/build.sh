#!/usr/bin/env bash
set -Eeuo pipefail

CURRENT_DIR="$(pwd)"
BASEQ3_SRC="${BASEQ3_SRC:-$CURRENT_DIR/../baseq3}"
BUILD_DIR="${BUILD_DIR:-$CURRENT_DIR/build}"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
pushd "$BUILD_DIR" >/dev/null

cmake ../../ioq3 \
  -DBUILD_CLIENT=OFF \
  -DBUILD_SERVER=ON \
  -DBUILD_GAME_QVMS=ON \
  -DBUILD_RENDERER_GL1=OFF \
  -DBUILD_RENDERER_GL2=OFF

make -j"$(nproc)"

cd Release

# Keep compiled game modules in baseq3 and optionally merge assets on top.
if [[ -d "$BASEQ3_SRC" ]]; then
  mkdir -p baseq3
  cp -a "$BASEQ3_SRC"/. ./baseq3/
else
  echo "WARNING: baseq3 source not found at $BASEQ3_SRC; expecting it to be mounted at runtime" >&2
  mkdir -p baseq3
fi
