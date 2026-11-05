#!/usr/bin/env bash
# Her uzantıyı Chrome'a yüklenebilir bir zip'e paketler: dist/<klasör>.zip
# Ad sürüm içermez ki README'deki "releases/latest/download/<ad>.zip" bağlantısı
# her sürümde çalışsın. Sürüm, Release etiketinde ve manifest.json'da durur.
# Pakete yalnızca çalışma anı dosyaları girer (manifest, icons, src), test ve belge girmez.
set -euo pipefail
KOK="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$KOK/dist"
rm -rf "$DIST"
mkdir -p "$DIST"

for klasor in "$KOK"/*/; do
  [ -f "$klasor/manifest.json" ] || continue  # scripts/, docs/ uzantı değil
  ad="$(basename "$klasor")"
  surum="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$klasor/manifest.json" | head -1)"
  icerik=(manifest.json src)
  [ -d "$klasor/icons" ] && icerik+=(icons)
  (cd "$klasor" && zip -r -q -X "$DIST/$ad.zip" "${icerik[@]}" -x '*.DS_Store' '*/__MACOSX/*')
  printf '  %-14s %-8s %s\n' "$ad" "$surum" "$(du -h "$DIST/$ad.zip" | cut -f1)"
done
echo "Paketler: $DIST"
