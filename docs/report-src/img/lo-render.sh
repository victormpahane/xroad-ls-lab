#!/usr/bin/env bash
# Render SVGs to 2x PNG with LibreOffice (fallback when headless Chrome is unavailable).
# usage: bash img/lo-render.sh name1 name2 ...   (names without .svg)
set -euo pipefail
cd "$(dirname "$0")"
tmp=$(mktemp -d -p .)
for name in "$@"; do
  w=$(grep -o 'width="[0-9]*"' "$name.svg" | head -1 | tr -dc '0-9')
  h=$(grep -o 'height="[0-9]*"' "$name.svg" | head -1 | tr -dc '0-9')
  # double the outer size; the viewBox keeps the drawing the same, so it renders at 2x
  sed "0,/width=\"$w\" height=\"$h\"/s//width=\"$((w*2))\" height=\"$((h*2))\"/" "$name.svg" > "$tmp/$name.svg"
  timeout -s KILL 90 libreoffice --headless --convert-to png --outdir "$tmp" "$tmp/$name.svg" >/dev/null 2>&1
  mv "$tmp/$name.png" "$name.png"
  echo "$name.png ${w}x${h} (rendered at 2x)"
done
rm -rf "$tmp"
