#!/usr/bin/env bash
# Tüm uzantıların testlerini çalıştırır. Node testleri her zaman koşar; tarayıcı
# testleri Chrome bulunursa koşar (CHROME değişkeniyle yol verilebilir).
# Bir test kalırsa 1 ile çıkar.
set -uo pipefail
KOK="$(cd "$(dirname "$0")/.." && pwd)"

CHROME="$(node "$KOK/scripts/chrome-bul.mjs" || true)"
export CHROME

kalan=0
kos() { # kos <etiket> <komut...>
  local etiket="$1"; shift
  if cikti="$("$@" 2>&1)"; then echo "  ✓ $etiket — $(printf '%s' "$cikti" | tail -1)"
  else echo "  ✗ $etiket"; printf '%s\n' "$cikti" | sed 's/^/      /'; kalan=1; fi
}

echo "manifest"
kos "yollar" node "$KOK/scripts/manifest-denetle.mjs"
echo "kurulum"
kos "dosyalar" bash "$KOK/kurulum/test.sh"

for klasor in "$KOK"/*/; do
  [ -f "$klasor/manifest.json" ] || continue  # scripts/, docs/ uzantı değil
  ad="$(basename "$klasor")"
  echo "$ad"
  cd "$klasor"
  [ -f tests/test.js ] && kos "birim" node tests/test.js
  if [ -n "$CHROME" ]; then
    [ -f tests/calistir.sh ] && kos "tarayıcı" bash tests/calistir.sh
    [ -f tests/calistir.mjs ] && kos "tarayıcı" node tests/calistir.mjs
  else
    echo "  - tarayıcı testi atlandı (Chrome bulunamadı)"
  fi
done
echo "firefox"
GECICI="$(mktemp -d)"
DIST="$GECICI" bash "$KOK/scripts/paketle.sh" >/dev/null
kos "paketler" node "$KOK/scripts/firefox-test.mjs" "$GECICI"
rm -rf "$GECICI"
exit $kalan
