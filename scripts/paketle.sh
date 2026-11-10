#!/usr/bin/env bash
# Her uzantıyı yüklenebilir zip'lere paketler: dist/<klasör>.zip (Chrome, Edge, Brave) ve
# dist/<klasör>-firefox.zip. Yanına işletim sistemi kurulum dosyalarını koyar.
# Ad sürüm içermez ki README'deki "releases/latest/download/<ad>.zip" bağlantısı
# her sürümde çalışsın. Sürüm, Release etiketinde ve manifest.json'da durur.
# Pakete yalnızca çalışma anı dosyaları girer (manifest, icons, src), test ve belge girmez.
set -euo pipefail
KOK="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${DIST:-$KOK/dist}"
rm -rf "$DIST"
mkdir -p "$DIST"

for klasor in "$KOK"/*/; do
  [ -f "$klasor/manifest.json" ] || continue  # scripts/, docs/ uzantı değil
  ad="$(basename "$klasor")"
  surum="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$klasor/manifest.json" | head -1)"
  icerik=(manifest.json src)
  [ -d "$klasor/icons" ] && icerik+=(icons)
  (cd "$klasor" && zip -r -q -X "$DIST/$ad.zip" "${icerik[@]}" -x '*.DS_Store' '*/__MACOSX/*')

  gecici="$(mktemp -d)"
  (cd "$klasor" && cp -R "${icerik[@]}" "$gecici/")
  node "$KOK/scripts/firefox-manifest.mjs" "$klasor" > "$gecici/manifest.json"
  (cd "$gecici" && zip -r -q -X "$DIST/$ad-firefox.zip" "${icerik[@]}" -x '*.DS_Store' '*/__MACOSX/*')
  rm -rf "$gecici"

  printf '  %-14s %-8s %s\n' "$ad" "$surum" "$(du -h "$DIST/$ad.zip" | cut -f1)"
done
cp "$KOK/kurulum/mac/kur.command" "$DIST/kur-mac.command"
cp "$KOK/kurulum/linux/kur.sh" "$DIST/kur-linux.sh"
cp "$KOK/kurulum/windows/kur.bat" "$DIST/kur-windows.bat"
echo "Paketler: $DIST"
