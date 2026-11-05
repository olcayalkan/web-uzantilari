#!/usr/bin/env bash
# tests/sayfa-testi.html'i görünmez Chrome'da açar ve sonucu yazdırır.
# Kullanım: tests/calistir.sh   (CHROME değişkeniyle farklı Chrome yolu verilebilir)
set -euo pipefail

KLASOR="$(cd "$(dirname "$0")" && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PROFIL="$(mktemp -d)"
trap 'rm -rf "$PROFIL"' EXIT

baslik=$("$CHROME" --headless=new --disable-gpu --allow-file-access-from-files \
  --user-data-dir="$PROFIL" --window-size=1000,600 --virtual-time-budget=5000 \
  --dump-dom "file://$KLASOR/sayfa-testi.html" 2>/dev/null \
  | sed -n 's:.*<title>\(.*\)</title>.*:\1:p')

echo "${baslik:-KALDI: sonuç okunamadı}"
[ "$baslik" = "GEÇTİ" ]
