#!/usr/bin/env bash
# Tüm uzantıların testlerini çalıştırır. Node testleri her zaman koşar; tarayıcı
# testleri Chrome bulunursa koşar (CHROME değişkeniyle yol verilebilir).
# Bir test kalırsa 1 ile çıkar.
set -uo pipefail
KOK="$(cd "$(dirname "$0")/.." && pwd)"

if [ -z "${CHROME:-}" ]; then
  for aday in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
              "$(command -v google-chrome || true)" "$(command -v chromium || true)"; do
    [ -n "$aday" ] && [ -x "$aday" ] && { CHROME="$aday"; break; }
  done
fi
export CHROME="${CHROME:-}"

kalan=0
kos() { # kos <etiket> <komut...>
  local etiket="$1"; shift
  if cikti="$("$@" 2>&1)"; then echo "  ✓ $etiket — $(printf '%s' "$cikti" | tail -1)"
  else echo "  ✗ $etiket"; printf '%s\n' "$cikti" | sed 's/^/      /'; kalan=1; fi
}

echo "manifest"
kos "yollar" node "$KOK/scripts/manifest-denetle.mjs"

for klasor in "$KOK"/uzantilar/*/; do
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
exit $kalan
