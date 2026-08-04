#!/bin/sh
set -eu

cpma_directory="${Q3JS_CPMA_DIRECTORY:-/data/cpma}"
manifest_path="${Q3JS_CPMA_MANIFEST_PATH:-/tmp/q3js-cpma-manifest.json}"
temporary_path="${manifest_path}.tmp"

printf '{"files":[' > "$temporary_path"
separator=""

for file in "$cpma_directory"/*.pk3; do
    [ -f "$file" ] || continue
    filename="${file##*/}"
    if ! printf '%s\n' "$filename" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9._-]*\.pk3$'; then
        printf 'Ignoring unsupported CPMA filename: %s\n' "$filename" >&2
        continue
    fi

    printf '%s"%s"' "$separator" "$filename" >> "$temporary_path"
    separator=","
done

printf ']}\n' >> "$temporary_path"
mv "$temporary_path" "$manifest_path"
