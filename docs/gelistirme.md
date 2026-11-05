# Geliştirme

## Gereksinim

- Node 22+ (yalnızca testler için; uzantıların kendisi bağımlılıksız)
- Tarayıcı testleri için Chrome. Yol farklıysa `CHROME=/yol/chrome scripts/test.sh`

## Komutlar

```bash
scripts/test.sh                   # birim + tarayıcı testleri, manifest denetimi
scripts/gizli-tara.sh             # commit'ten önce: anahtar/token/kişisel yol
scripts/paketle.sh                # dist/<ad>.zip
```

Tek bir uzantıda çalışırken o klasörde:

```bash
node tests/test.js                # domain testleri
tests/calistir.sh                 # ya da: node tests/calistir.mjs (Voice Tamer)
```

Kodu değiştirdikten sonra uzantılar sayfasında kartın ↻ düğmesine bas, sekmeyi yenile.

## Kurulum animasyonları

README'deki animasyonlar `scripts/tanitim/` altında üretilir. `sahne.html` her uzantının
kurulumunu ve ilk kullanımını, uzantıların gerçek koduyla çizer.

```bash
node scripts/tanitim/svg-yap.mjs                 # docs/videolar/<ad>.svg (README'de oynayan)
node scripts/tanitim/yakala.mjs <ad> kareler     # 30 fps kareler; MP4 için:
ffmpeg -framerate 30 -i kareler/%04d.jpg -c:v libx264 -crf 20 -pix_fmt yuv420p docs/videolar/<ad>.mp4
```

SVG, GIF değil: GitHub GIF'lere oynat düğmesi koyar ve "hareketi azalt" açıkken durdurur;
SVG'nin CSS animasyonu sayfa açılınca kendiliğinden oynar.

## Yeni uzantı eklemek

1. Depo kökünde `<kisa-ad>/` klasörünü aç; klasör adı zip'in adı olur. İçinde
   `manifest.json` olan her kök klasör uzantı sayılır, betikler onu kendiliğinden bulur.
2. [mimari.md](mimari.md)'deki düzeni kur: `manifest.json`, `icons/`,
   `src/{core,features/<özellik>/{domain,data,presentation},background}`.
3. `tests/test.js` ekle: domain fonksiyonlarını Node'da test etsin, başarısızlıkta
   1 ile çıksın. `scripts/test.sh` onu kendiliğinden bulur.
4. Kökteki README'nin tablolarına bir satır ekle (ne yapar, izinler, veri nereye gider).
5. `scripts/test.sh && scripts/gizli-tara.sh`

## Sürüm çıkarmak

1. Değişen uzantının `manifest.json` → `version` alanını artır.
2. Commit'le, `main`'e birleştir.
3. Etiket at ve gönder:

   ```bash
   git tag v1.4.0
   git push origin v1.4.0
   ```

`.github/workflows/surum.yml` testleri koşar, dört zip'i üretir ve Release'e ekler.
README'deki indirme bağlantıları `releases/latest` gösterdiği için değişmeden
yeni sürüme işaret eder.

## Gizli bilgi kuralı

Depoda hiçbir anahtar, token, şifre, kişisel yol ya da e-posta bulunmaz.

- Uzantıların hiçbiri anahtar gerektirmez. Bir gün gerekirse anahtarı koda değil,
  kullanıcının popup'tan girdiği ve `chrome.storage.local`'da duran bir ayara koy.
- `manifest.json`'a `key` alanı ekleme; uzantı kimliğini kişisel imzaya bağlar.
- `.pem` / `.crx` imzalama dosyaları `.gitignore`'da; `gizli-tara.sh` de reddeder.
- CI her push'ta `gizli-tara.sh` çalıştırır. Repo ayarlarında **Secret scanning**
  ve **Push protection**'ı da aç (Settings → Code security).
