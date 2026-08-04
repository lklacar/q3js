#!/bin/sh
set -eu

data_directory="${Q3JS_DATA_DIRECTORY:-/data}"
manifest_directory="${Q3JS_MANIFEST_DIRECTORY:-/tmp/q3js-manifests}"

mkdir -p "$manifest_directory"

for game_directory in "$data_directory"/*; do
    [ -d "$game_directory" ] || continue

    game="${game_directory##*/}"
    if ! printf '%s\n' "$game" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9_-]*$'; then
        printf 'Ignoring unsupported game directory: %s\n' "$game" >&2
        continue
    fi

    manifest_path="$manifest_directory/$game.json"
    temporary_path="$manifest_path.tmp"
    printf '{"files":[' > "$temporary_path"
    separator=""

    for file in "$game_directory"/*.pk3; do
        [ -f "$file" ] || continue
        filename="${file##*/}"
        if ! printf '%s\n' "$filename" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9._-]*\.pk3$'; then
            printf 'Ignoring unsupported PK3 filename in %s: %s\n' "$game" "$filename" >&2
            continue
        fi

        printf '%s"%s"' "$separator" "$filename" >> "$temporary_path"
        separator=","
    done

    printf ']}\n' >> "$temporary_path"
    mv "$temporary_path" "$manifest_path"
done
