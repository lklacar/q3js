#!/usr/bin/env bash
set -Eeuo pipefail

CURRENT_DIR="$(pwd)"
BASEQ3_SRC="${BASEQ3_SRC:-$CURRENT_DIR/../baseq3}"
BUILD_DIR="${BUILD_DIR:-$CURRENT_DIR/build}"
WEB_QVM_DIR="${WEB_QVM_DIR:-$CURRENT_DIR/../website-next/public/baseq3/vm}"
WEB_Q3JS_QVM_DIR="${WEB_Q3JS_QVM_DIR:-$CURRENT_DIR/../website-next/public/q3js/vm}"

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

if [[ -d baseq3/vm ]]; then
  if mkdir -p "$WEB_QVM_DIR" "$WEB_Q3JS_QVM_DIR" 2>/dev/null; then
    cp -a baseq3/vm/*.qvm "$WEB_QVM_DIR"/ || echo "WARNING: failed to sync baseq3 loose QVMs to $WEB_QVM_DIR" >&2
    cp -a baseq3/vm/*.qvm "$WEB_Q3JS_QVM_DIR"/ || echo "WARNING: failed to sync q3js loose QVMs to $WEB_Q3JS_QVM_DIR" >&2
  else
    echo "WARNING: failed to create web QVM directories; skipping web asset sync" >&2
  fi
fi

rm -rf q3js
mkdir -p q3js
cp -a baseq3/. q3js/
