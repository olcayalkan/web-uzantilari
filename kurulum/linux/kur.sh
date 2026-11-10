#!/usr/bin/env bash
# Linux kurulumu: seçilen uzantıları son Release'ten ~/WebUzantilari altına indirir, seçilen
# tarayıcının uzantı sayfasını ve klasörü açar. Görünür klasör seçilir, çünkü Snap ile kurulan
# Chromium gizli klasörlere erişemez.
# Kullanım: kur.sh [uzantı ... | hepsi] [--tarayici chrome|chromium|brave|edge|firefox]
set -euo pipefail

KAYNAK="${KUR_KAYNAK:-https://github.com/olcayalkan/web-uzantilari/releases/latest/download}"
KLASOR="${KUR_KLASOR:-$HOME/WebUzantilari}"
UZANTILAR=(oto-cozucu oto-cevirmen sola-itele voice-tamer)
SECILEN=""
ISTENEN=""        # --tarayici değeri
TARAYICILAR=()    # "anahtar|komut ya da uygulama adı|uzantılar sayfası"
SEC_ANAHTAR=""; SEC_KOMUT=""; SEC_SAYFA=""
EK=""             # Firefox paketinin dosya adı eki
HEDEF="$KLASOR"
ZATEN_SECILDI=0

tarayiciEkle() { TARAYICILAR+=("$1|$2|$3"); }

sec() { # sec <ad|hepsi>
  ZATEN_SECILDI=1
  if [ "$1" = hepsi ]; then SECILEN="${UZANTILAR[*]}"; return; fi
  for u in "${UZANTILAR[@]}"; do
    if [ "$u" = "$1" ]; then SECILEN="$SECILEN $u"; return; fi
  done
  echo "Bilinmeyen uzantı: $1 (seçenekler: ${UZANTILAR[*]} hepsi)" >&2
  exit 2
}

# curl | bash ile çalışırken stdin betiğin kendisidir; yanıt terminalden okunur.
sor() { # sor <soru> → yanıtı YANIT'a yazar, terminal yoksa boş kalır
  YANIT=""
  { read -r -p "$1" YANIT </dev/tty; } 2>/dev/null || YANIT=""
}

menu() {
  echo "Hangi uzantılar kurulsun?"
  local i=1
  for u in "${UZANTILAR[@]}"; do echo "  $i) $u"; i=$((i + 1)); done
  echo "  $i) hepsi"
  sor "Numara (boşlukla birden fazla, varsayılan hepsi): "
  if [ -z "$YANIT" ]; then sec hepsi; return; fi
  for n in $YANIT; do
    case "$n" in
      1|2|3|4) sec "${UZANTILAR[$((n - 1))]}" ;;
      5) sec hepsi ;;
      *) sec "$n" ;;
    esac
  done
}

ayristir() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --tarayici)
        ISTENEN="${2:-}"; [ "$#" -ge 2 ] && shift
        case "$ISTENEN" in
          chrome|chromium|brave|edge|firefox) ;;
          *) echo "Bilinmeyen tarayıcı: $ISTENEN (seçenekler: chrome chromium brave edge firefox)" >&2; exit 2 ;;
        esac ;;
      *) sec "$1" ;;
    esac
    shift
  done
  if [ "$ZATEN_SECILDI" = 0 ]; then menu; fi
}

tarayiciAta() { # tarayiciAta <"anahtar|komut|sayfa">
  SEC_ANAHTAR="${1%%|*}"
  local kalan="${1#*|}"
  SEC_KOMUT="${kalan%%|*}"
  SEC_SAYFA="${kalan#*|}"
}

# Birden çok tarayıcı varsa sorulur: Windows'ta Edge hep kuruludur, kullanıcınınki olmayabilir.
tarayiciSec() {
  local n=${#TARAYICILAR[@]} s i
  if [ -n "$ISTENEN" ]; then
    SEC_ANAHTAR="$ISTENEN"
    if [ "$n" -gt 0 ]; then
      for s in "${TARAYICILAR[@]}"; do
        if [ "${s%%|*}" = "$ISTENEN" ]; then tarayiciAta "$s"; fi
      done
    fi
  elif [ "$n" = 1 ]; then
    tarayiciAta "${TARAYICILAR[0]}"
  elif [ "$n" -gt 1 ]; then
    echo "Hangi tarayıcıya kurulsun?"
    i=1
    for s in "${TARAYICILAR[@]}"; do echo "  $i) ${s%%|*}"; i=$((i + 1)); done
    sor "Numara (varsayılan 1): "
    case "$YANIT" in
      ''|*[!0-9]*) i=1 ;;
      *) i="$YANIT" ;;
    esac
    if [ "$i" -lt 1 ] || [ "$i" -gt "$n" ]; then i=1; fi
    tarayiciAta "${TARAYICILAR[$((i - 1))]}"
  fi
  if [ "$SEC_ANAHTAR" = firefox ]; then EK="-firefox"; HEDEF="$KLASOR/firefox"; fi
}

# Yeni sürüm önce geçici klasöre iner: indirme bozulursa çalışan kurulum silinmez.
# Klasör yolu aynı kalır, çünkü Chromium uzantı kimliğini ve ayarları yola bağlar.
kur() {
  local ad="$1" gecici
  gecici="$(mktemp -d)"
  if ! curl -fsSL -o "$gecici/$ad.zip" "$KAYNAK/$ad$EK.zip"; then
    rm -rf "$gecici"; echo "İndirilemedi: $KAYNAK/$ad$EK.zip" >&2; return 1
  fi
  unzip -q "$gecici/$ad.zip" -d "$gecici/$ad"
  if [ ! -f "$gecici/$ad/manifest.json" ]; then
    rm -rf "$gecici"; echo "Pakette manifest.json yok: $ad" >&2; return 1
  fi
  mkdir -p "$HEDEF"
  rm -rf "${HEDEF:?}/$ad"
  mv "$gecici/$ad" "$HEDEF/$ad"
  rm -rf "$gecici"
  echo "  $ad $(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$HEDEF/$ad/manifest.json" | head -1)"
}

indir() {
  echo "İndiriliyor: $HEDEF"
  for ad in $SECILEN; do kur "$ad"; done
}

sonAdimlar() {
  echo
  if [ -n "$SEC_KOMUT" ]; then echo "$SEC_KOMUT uzantı sayfası açıldı."
  else echo "Tarayıcı açılamadı; uzantı sayfası elle açılır (Firefox: about:debugging, diğerleri: chrome://extensions)."; fi
  if [ "$SEC_ANAHTAR" = firefox ]; then
    echo "Kalan adımlar:"
    echo "  1. Geçici Eklenti Yükle düğmesine bas."
    echo "  2. Her uzantı için manifest.json dosyasını seç:"
    for ad in $SECILEN; do echo "     $HEDEF/$ad/manifest.json"; done
    echo "  3. Açık sekmeleri yenile."
    echo "Firefox geçici eklentiyi kapanınca kaldırır; kalıcı kurulum Mozilla imzası ister."
  else
    echo "Tarayıcı, mağaza dışındaki uzantıyı kendiliğinden yüklemez. Kalan adımlar:"
    echo "  1. Geliştirici modu anahtarını aç."
    echo "  2. Her uzantı için Paketlenmemiş öğe yükle düğmesine bas ve klasörünü seç:"
    for ad in $SECILEN; do echo "     $HEDEF/$ad"; done
    echo "  3. Açık sekmeleri yenile."
  fi
}

if [ "$(uname -s)" != Linux ]; then
  echo "Bu dosya Linux içindir. macOS: kur-mac.command, Windows: kur-windows.bat" >&2
  exit 1
fi
for arac in curl unzip; do
  if ! command -v "$arac" >/dev/null; then
    echo "$arac bulunamadı. Dağıtımın paket yöneticisiyle kurulabilir (ör. sudo apt install $arac)." >&2
    exit 1
  fi
done

ayristir "$@"

# Aynı tarayıcının adı dağıtıma göre değişir; ilk bulunan yeter.
ilkKomut() { for k in "$@"; do if command -v "$k" >/dev/null; then echo "$k"; return; fi; done; }
ekle() { local k; k="$(ilkKomut "${@:3}")"; if [ -n "$k" ]; then tarayiciEkle "$1" "$k" "$2"; fi; }
ekle chrome chrome://extensions google-chrome-stable google-chrome
ekle chromium chrome://extensions chromium chromium-browser
ekle brave brave://extensions brave-browser brave
ekle edge edge://extensions microsoft-edge-stable microsoft-edge
ekle firefox "about:debugging#/runtime/this-firefox" firefox firefox-esr
tarayiciSec
indir

# Grafik oturumu yoksa (SSH) açılacak pencere de yoktur.
if [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then
  if [ -n "$SEC_KOMUT" ]; then nohup "$SEC_KOMUT" "$SEC_SAYFA" >/dev/null 2>&1 & fi
  if command -v xdg-open >/dev/null; then xdg-open "$HEDEF" >/dev/null 2>&1 || true; fi
  if command -v wl-copy >/dev/null; then printf '%s' "$HEDEF" | wl-copy || true
  elif command -v xclip >/dev/null; then printf '%s' "$HEDEF" | xclip -selection clipboard || true
  fi
else
  SEC_KOMUT=""
fi

sonAdimlar
