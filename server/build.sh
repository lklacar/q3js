#!/usr/bin/env bash
set -Eeuo pipefail

CURRENT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$CURRENT_DIR/.." && pwd)"
BASEQ3_SRC="${BASEQ3_SRC:-$PROJECT_DIR/baseq3}"
BUILD_DIR="${BUILD_DIR:-$CURRENT_DIR/build}"
Q3JS_VM_PK3="${Q3JS_VM_PK3:-zz-q3js-vm-v1.pk3}"
WEBSITE_Q3JS_PUBLIC_DIR="${WEBSITE_Q3JS_PUBLIC_DIR:-$PROJECT_DIR/website-next/public/q3js}"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
pushd "$BUILD_DIR" >/dev/null

cmake "$PROJECT_DIR/ioq3" \
  -DBUILD_CLIENT=OFF \
  -DBUILD_SERVER=ON \
  -DBUILD_GAME_QVMS=ON \
  -DBUILD_RENDERER_GL1=OFF \
  -DBUILD_RENDERER_GL2=OFF

make -j"$(nproc)"

cd Release

BUILT_MODULES_DIR="$BUILD_DIR/built-game-modules"
mkdir -p "$BUILT_MODULES_DIR/vm"

for module in cgame qagame ui; do
  if [[ -f "baseq3/$module.so" ]]; then
    cp -a "baseq3/$module.so" "$BUILT_MODULES_DIR/$module.so"
  fi
  if [[ -f "baseq3/vm/$module.qvm" ]]; then
    cp -a "baseq3/vm/$module.qvm" "$BUILT_MODULES_DIR/vm/$module.qvm"
  fi
done

# Keep compiled game modules in baseq3 and optionally merge assets on top.
if [[ -d "$BASEQ3_SRC" ]]; then
  mkdir -p baseq3
  cp -a "$BASEQ3_SRC"/. ./baseq3/
else
  echo "WARNING: baseq3 source not found at $BASEQ3_SRC; expecting it to be mounted at runtime" >&2
  mkdir -p baseq3
fi

# Put Q3JS game modules in their own fs_game directory. Baseq3 stays vanilla,
# and clients only load the custom cgame when they join an fs_game=q3js server.
mkdir -p q3js/vm
for module in cgame qagame ui; do
  if [[ -f "$BUILT_MODULES_DIR/$module.so" ]]; then
    cp -a "$BUILT_MODULES_DIR/$module.so" "q3js/$module.so"
  fi
  if [[ -f "$BUILT_MODULES_DIR/vm/$module.qvm" ]]; then
    cp -a "$BUILT_MODULES_DIR/vm/$module.qvm" "q3js/vm/$module.qvm"
  fi
done

(
  cd q3js
  zip -q -9 -X "$Q3JS_VM_PK3" vm/cgame.qvm vm/qagame.qvm vm/ui.qvm
)

if [[ -n "$WEBSITE_Q3JS_PUBLIC_DIR" ]]; then
  mkdir -p "$WEBSITE_Q3JS_PUBLIC_DIR"
  cp -a "q3js/$Q3JS_VM_PK3" "$WEBSITE_Q3JS_PUBLIC_DIR/$Q3JS_VM_PK3"
fi

# Keep QVMs in the pk3 only.
for module in cgame qagame ui; do
  rm -f "q3js/vm/$module.qvm"
done
