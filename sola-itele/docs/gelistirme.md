# Geliştirme

## Kod düzeni

Katmanlar içten dışa bağımlıdır; `domain` hiçbir şeye bağımlı değildir.

| Klasör | İçerik | Kural |
|---|---|---|
| `src/core/` | Sabitler | Anahtar ve varsayılanlar yalnızca burada tanımlanır |
| `src/features/itele/domain/` | Saf hesap | DOM ve chrome API'si yok, Node ile test edilir |
| `src/features/itele/data/` | `chrome.storage` sarmalayıcı | Depoya yalnızca buradan erişilir |
| `src/features/itele/presentation/` | İçerik betiği ve panel | Hesap yapmaz, domain'i çağırır |
| `src/background/` | Service worker | Yalnızca rozet |
| `docs/` | Belgeler | — |
| `tests/` | Testler | — |

Dosya yolu değişirse `manifest.json` (`service_worker`, `default_popup`, `content_scripts.js`), `popup.html` içindeki `<script src>` ve `tests/sayfa-testi.html` güncellenmelidir. İçerik betiklerinin sırası önemlidir: önce `core`, sonra `domain`, `data`, en son `presentation`.

## Test

```bash
node tests/test.js   # domain: yerleşim hesabı
tests/calistir.sh    # gerçek sayfa, görünmez Chrome
```

`tests/calistir.sh` `tests/sayfa-testi.html` dosyasını 1000px genişliğinde görünmez Chrome'da açar. Sayfa `chrome.storage` API'sini taklit eder, içerik betiklerini manifest sırasıyla yükler ve üç durumu ölçer: %70 açık, canlı geçişle %80, kapalı. Sonuç `GEÇTİ` ya da beklenen/gelen değerleriyle `KALDI: ...` olarak yazdırılır. Betik başarıda 0, başarısızlıkta 1 ile çıkar.

Chrome farklı bir yerdeyse:

```bash
CHROME=/yol/google-chrome tests/calistir.sh
```

Paneli elle denemek için eklentiyi yeniden yükleyip simgeye tıklayın. Panelin konsolunu görmek için panele sağ tıklayıp **İncele**'yi seçin.

## Sık yapılan değişiklikler

| Değişiklik | Dosya |
|---|---|
| Varsayılan oran | `src/core/sabitler.js` (`VARSAYILAN_ORAN`) |
| Kaydırıcı aralığı / adımı | `src/features/itele/presentation/popup/popup.html` (`min`, `max`, `step`) ve yanındaki `%30` / `%95` etiketleri |
| Hazır oran düğmeleri | `src/features/itele/presentation/popup/popup.html` (`data-oran` düğmeleri) |
| Panel renkleri | `src/features/itele/presentation/popup/popup.css` (`:root` değişkenleri) |
| Rozet metni | `src/background/service_worker.js` |
| Yeniden tarama gecikmesi | `src/core/sabitler.js` (`TARAMA_GECIKMESI`, 250 ms) |
| Fixed öğe yerleşim kuralları | `src/features/itele/domain/itele_motoru.js` (`fixedYerlesim`) |
