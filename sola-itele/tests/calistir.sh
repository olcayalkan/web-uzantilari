#!/usr/bin/env bash
# tests/sayfa-testi.html'i görünmez Chrome'da iki kez açar: yer kaplamayan kaydırma çubuğuyla
# (macOS) ve yer kaplayanla (Windows, Linux). Sonucu yazdırır.
# Kullanım: tests/calistir.sh   (CHROME değişkeniyle farklı Chrome yolu verilebilir)
set -euo pipefail

KLASOR="$(cd "$(dirname "$0")" && pwd)"
CHROME="${CHROME:-$(node "$KLASOR/../../scripts/chrome-bul.mjs")}"
PROFIL="$(mktemp -d)"
trap 'rm -rf "$PROFIL"' EXIT

for sorgu in "" "?kaydirma"; do
  baslik=$("$CHROME" --headless=new --disable-gpu --allow-file-access-from-files \
    --user-data-dir="$PROFIL" --window-size=1000,600 --virtual-time-budget=5000 \
    --dump-dom "file://$KLASOR/sayfa-testi.html$sorgu" 2>/dev/null \
    | sed -n 's:.*<title>\(.*\)</title>.*:\1:p')
  if [ "$baslik" != "GEÇTİ" ]; then echo "${baslik:-KALDI: sonuç okunamadı} ($sorgu)"; exit 1; fi
done
echo "GEÇTİ"
