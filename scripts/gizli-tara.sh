#!/usr/bin/env bash
# Depoya girmemesi gereken bilgileri arar: API anahtarı, token, özel anahtar,
# kişisel dosya yolu ve e-posta, uzantı imzalama dosyaları. Bulursa 1 ile çıkar.
# CI her push'ta çalıştırır, commit'ten önce elle de çalıştırılabilir.
set -euo pipefail
KOK="$(cd "$(dirname "$0")/.." && pwd)"
cd "$KOK"

# Git deposundaysa izlenen + eklenmeye aday dosyalar, değilse tüm dosyalar.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  dosyalar=$(git ls-files --cached --others --exclude-standard)
else
  dosyalar=$(find . -type f -not -path './.git/*' -not -path './dist/*' | sed 's#^\./##')
fi
# Bu betik desenlerin kendisini içerir; kendini taramasın.
dosyalar=$(printf '%s\n' "$dosyalar" | grep -v '^scripts/gizli-tara.sh$' || true)

DESENLER=(
  'AKIA[0-9A-Z]{16}'                          # AWS erişim anahtarı
  'AIza[0-9A-Za-z_-]{35}'                     # Google API anahtarı
  'gh[pousr]_[A-Za-z0-9]{30,}'                # GitHub token
  'github_pat_[A-Za-z0-9_]{20,}'
  'sk-(ant-|proj-)?[A-Za-z0-9_-]{20,}'        # OpenAI / Anthropic anahtarı
  'xox[abprs]-[A-Za-z0-9-]{10,}'              # Slack token
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  '"key"[[:space:]]*:[[:space:]]*"MII'        # manifest.json'a gömülü uzantı açık anahtarı
  '(client_secret|api[_-]?key|access[_-]?token|password)[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"']{8,}'
  '/Users/[A-Za-z0-9._-]+/|/home/[a-z][a-z0-9_-]+/'   # kişisel mutlak yol
  '[A-Za-z0-9._%+-]+@(gmail|hotmail|outlook|yahoo|icloud|yandex)\.com'
)

bulundu=0
for desen in "${DESENLER[@]}"; do
  if sonuc=$(printf '%s\n' "$dosyalar" | tr '\n' '\0' | xargs -0 grep -nIE -e "$desen" -- 2>/dev/null); then
    echo "✗ Desen: $desen"; printf '%s\n' "$sonuc" | cut -c1-160 | sed 's/^/    /'; bulundu=1
  fi
done

# İçeriğinden bağımsız, depoya hiç girmemesi gereken dosya türleri.
if yasak=$(printf '%s\n' "$dosyalar" | grep -E '(\.pem|\.crx|\.p12|\.key|(^|/)\.env(\..*)?)$'); then
  echo "✗ Yasak dosya:"; printf '%s\n' "$yasak" | sed 's/^/    /'; bulundu=1
fi

if [ $bulundu -eq 0 ]; then echo "✓ Gizli bilgi bulunamadı ($(printf '%s\n' "$dosyalar" | grep -c .) dosya tarandı)"; fi
exit $bulundu
