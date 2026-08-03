#!/bin/bash

set -e

export DBUILD_CLIENT="${DBUILD_CLIENT:-0}"
export DBUILD_SERVER="${DBUILD_SERVER:-1}"
export DUSE_HTTP="${DUSE_HTTP:-1}"
export DUSE_CODEC_OPUS="${DUSE_CODEC_OPUS:-1}"
export DUSE_VOIP="${DUSE_VOIP:-1}"
export DCMAKE_INSTALL_PREFIX="${DCMAKE_INSTALL_PREFIX:-~/ioquake3}"
IOQ3REMOTE="${IOQ3REMOTE:-https://github.com/ioquake/ioq3.git}"
CMAKE_OPTS="${CMAKE_OPTS:-}"

if ! [ -x "$(command -v git)" ] || ! [ -x "$(command -v cmake)" ]; then
        echo "This build script requires 'git' and 'cmake' to be installed." >&2
        echo "Please install them through your normal package installation system." >&2
        exit 1
fi

echo " This build process requires all of the ioquake3 dependencies necessary for an ioquake3 server.
 If you do not have the necessary dependencies the build will fail.

 Please post a message to https://discourse.ioquake.org/ asking for help and include whatever error messages you received during the compile phase.

 We will be building from the git repo at ${IOQ3REMOTE}
 The resulting binary will be installed to ${DCMAKE_INSTALL_PREFIX}

 If you need to change these, please set variables as follows:

 IOQ3REMOTE=https://github.com/something/something.git DCMAKE_INSTALL_PREFIX=~/somewhere $0"

BUILD_DIR="$(mktemp -d)"
trap "rm -rf $BUILD_DIR" EXIT

while true; do
        read -p "Are you ready to compile ioquake3 from ${IOQ3REMOTE}, and have it installed into $DCMAKE_INSTALL_PREFIX? " yn
        case $yn in
                [Yy]*)
                        git clone $IOQ3REMOTE $BUILD_DIR/ioq3
                        cd $BUILD_DIR/ioq3
                        cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
                        -DBUILD_CLIENT="$DBUILD_CLIENT" \
                        -DBUILD_SERVER="DBUILD_SERVER" \
                        -DUSE_HTTP="$DUSE_HTTP" \
                        -DUSE_CODEC_OPUS="$USE_CODEC_OPUS" \
                        -DUSE_VOIP="$USE_VOIP" \
                        -DCMAKE_INSTALL_PREFIX="$DCMAKE_INSTALL_PREFIX" \
                        $CMAKE_OPTS
                        cmake --build build 
                        cmake --install build
                        exit
                        ;;
                [Nn]*)
                        echo "aborting installation."
                        exit
                        ;;
                *)
                        echo "Please answer yes or no."
                        ;;
        esac
done
