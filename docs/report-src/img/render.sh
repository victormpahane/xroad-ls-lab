#!/usr/bin/env bash
# Render every img/*.svg to a 2x PNG with headless Chrome.
set -euo pipefail
cd "$(dirname "$0")"
for svg in *.svg; do
  name=${svg%.svg}
  w=$(grep -o 'width="[0-9]*"' "$svg" | head -1 | tr -dc '0-9')
  h=$(grep -o 'height="[0-9]*"' "$svg" | head -1 | tr -dc '0-9')
  printf '<html><body style="margin:0">%s</body></html>' "$(cat "$svg")" > "$name.html"
  timeout 60 google-chrome --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
    --window-size="$w,$h" --screenshot="$PWD/$name.png" "file://$PWD/$name.html" >/dev/null 2>&1
  rm "$name.html"
  echo "$name.png ${w}x${h}"
done
