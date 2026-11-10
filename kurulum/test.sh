#!/usr/bin/env bash
# Kurulum dosyalarını gerçek ağ ve tarayıcı olmadan dener: paketler yerelden gelir, sistem adı
# ve tarayıcı komutları sahte. Windows dosyası burada çalıştırılamadığı için biçimi denetlenir.
set -uo pipefail
KOK="$(cd "$(dirname "$0")/.." && pwd)"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
hata=0; sayac=0
ok() { sayac=$((sayac + 1)); if ! eval "$2"; then echo "KALDI: $1"; hata=1; fi; }

if ! command -v zip >/dev/null; then echo "zip yok, atlandı"; exit 0; fi
DIST="$T/kaynak" bash "$KOK/scripts/paketle.sh" >/dev/null
UZANTILAR=""
for k in "$KOK"/*/; do
  [ -f "$k/manifest.json" ] && UZANTILAR="$UZANTILAR $(basename "$k")"
done

sahte() { # sahte <klasör> <komut> <gövde>
  mkdir -p "$1"; printf '#!/usr/bin/env bash\n%s\n' "$3" > "$1/$2"; chmod +x "$1/$2"
}
sahte "$T/mac" uname 'echo Darwin'
sahte "$T/mac" open 'echo "open $*" >> "$GUNLUK"; exit 0'
sahte "$T/mac" pbcopy 'cat > /dev/null'
sahte "$T/linux" uname 'echo Linux'
sahte "$T/linux" google-chrome 'echo "chrome $*" >> "$GUNLUK"'
sahte "$T/linux" firefox 'echo "firefox $*" >> "$GUNLUK"'
sahte "$T/linux" xdg-open 'echo "xdg $*" >> "$GUNLUK"'
sahte "$T/diger" uname 'echo Plan9'

dene() { # dene <sistem> <betik> <hedef> <argümanlar...>
  local sistem="$1" betik="$2" hedef="$3"; shift 3
  env PATH="$T/$sistem:$PATH" GUNLUK="$T/gunluk" DISPLAY=:0 KUR_KAYNAK="file://$T/kaynak" KUR_KLASOR="$hedef" \
    bash "$KOK/kurulum/$betik" "$@" </dev/null >"$T/cikti" 2>&1
}

# Linux'ta tarayıcı arka planda açılır; günlüğe düşmesi beklenir.
gunlukte() { local i; for i in 1 2 3 4 5 6 7 8 9 10; do grep -q "$1" "$T/gunluk" && return 0; sleep 0.2; done; return 1; }

for s in "mac mac/kur.command" "linux linux/kur.sh"; do
  sistem="${s% *}"; betik="${s#* }"; hedef="$T/$sistem-kurulum"; : > "$T/gunluk"

  dene diger "$betik" "$hedef" hepsi --tarayici chrome; kod=$?
  ok "$sistem: başka sistemde durur" "[ $kod = 1 ] && [ ! -e '$hedef' ]"

  dene "$sistem" "$betik" "$hedef" oto-cevirmen --tarayici chrome; kod=$?
  ok "$sistem: seçilen uzantı kurulur" "[ $kod = 0 ] && [ -f '$hedef/oto-cevirmen/manifest.json' ] && [ ! -e '$hedef/sola-itele' ]"
  ok "$sistem: uzantılar sayfası açılır" "gunlukte 'chrome://extensions'"
  ok "$sistem: son adımlar yazılır" "grep -q 'Paketlenmemiş' '$T/cikti' && grep -q '$hedef/oto-cevirmen' '$T/cikti'"

  touch "$hedef/oto-cevirmen/eski-dosya"
  dene "$sistem" "$betik" "$hedef" oto-cevirmen --tarayici chrome
  ok "$sistem: güncelleme eskiyi temizler" "[ ! -e '$hedef/oto-cevirmen/eski-dosya' ] && [ -f '$hedef/oto-cevirmen/manifest.json' ]"

  dene "$sistem" "$betik" "$hedef" hepsi --tarayici chrome; kod=$?
  ok "$sistem: hepsi kurulur" "[ $kod = 0 ] && [ -f '$hedef/voice-tamer/manifest.json' ] && [ -f '$hedef/oto-cozucu/manifest.json' ]"

  dene "$sistem" "$betik" "$hedef" yok-boyle --tarayici chrome; kod=$?
  ok "$sistem: bilinmeyen ad reddedilir" "[ $kod = 2 ]"

  dene "$sistem" "$betik" "$hedef" oto-cevirmen --tarayici opera; kod=$?
  ok "$sistem: bilinmeyen tarayıcı reddedilir" "[ $kod = 2 ]"

  : > "$T/gunluk"
  dene "$sistem" "$betik" "$hedef" oto-cevirmen --tarayici firefox; kod=$?
  ok "$sistem: Firefox paketi ayrı klasöre iner" "[ $kod = 0 ] && grep -q '\"gecko\"' '$hedef/firefox/oto-cevirmen/manifest.json'"
  ok "$sistem: Chromium paketi Firefox kurulumundan etkilenmez" "! grep -q '\"gecko\"' '$hedef/oto-cevirmen/manifest.json'"
  ok "$sistem: Firefox sayfası açılır" "gunlukte 'about:debugging'"
  ok "$sistem: Firefox adımları yazılır" "grep -q 'Geçici Eklenti' '$T/cikti' && grep -q 'firefox/oto-cevirmen/manifest.json' '$T/cikti'"

  env PATH="$T/$sistem:$PATH" GUNLUK="$T/gunluk" DISPLAY=:0 KUR_KAYNAK="file://$T/bos" KUR_KLASOR="$hedef" \
    bash "$KOK/kurulum/$betik" sola-itele --tarayici chrome </dev/null >"$T/cikti" 2>&1; kod=$?
  ok "$sistem: indirme bozulursa kurulum silinmez" "[ $kod != 0 ] && [ -f '$hedef/sola-itele/manifest.json' ]"

  ok "$sistem: çalıştırılabilir" "[ -x '$KOK/kurulum/$betik' ]"
done

BAT="$KOK/kurulum/windows/kur.bat"
ok "windows: tüm satırlar CRLF" "[ \"\$(grep -c \$'\\r\$' '$BAT')\" = \"\$(wc -l < '$BAT' | tr -d ' ')\" ]"
for ad in $UZANTILAR; do
  ok "windows: $ad listede" "grep -q '$ad' '$BAT'"
  ok "mac: $ad listede" "grep -q '^UZANTILAR=.*$ad' '$KOK/kurulum/mac/kur.command'"
  ok "linux: $ad listede" "grep -q '^UZANTILAR=.*$ad' '$KOK/kurulum/linux/kur.sh'"
done

[ "$hata" = 0 ] && echo "GEÇTİ ($sayac kontrol)"
exit $hata
