# Mimari

Her uzantı aynı katmanlı düzeni izler. Amaç, iş mantığını tarayıcıdan bağımsız
tutmak: saf kod Node ile saniyeler içinde test edilir, tarayıcıya bağlı kod ince kalır.

```
src/
├── core/                    Sabitler: depo anahtarları, sınırlar, varsayılanlar
├── features/<özellik>/
│   ├── domain/              Saf iş mantığı
│   ├── data/                Dış dünya bağdaştırıcıları
│   └── presentation/        Arayüz: popup, sayfa içi balon/panel
└── background/              Service worker: menü, kısayol, rozet
```

## Bağımlılık kuralı

Bağımlılık yalnızca içe doğrudur:

```
presentation ─┐
background ───┼──► data ──► domain ──► core
              └───────────► domain
```

| Katman | Bilebilir | Bilemez |
|---|---|---|
| `core` | — | Her şey |
| `domain` | `core` | `chrome.*`, DOM, `fetch`, `localStorage`, Web Audio |
| `data` | `core`, `domain` | DOM arayüzü |
| `presentation`, `background` | Hepsi | — |

Bu kural iki şey kazandırır:

- **Test:** `domain` dosyaları `module.exports` ile de dışa açılır, `tests/test.js`
  onları Node'da doğrudan `require` eder. Tarayıcı gerekmez, CI'da hızlı koşar.
- **Değiştirilebilirlik:** Depolama `chrome.storage`'dan başka bir yere taşınırsa
  yalnızca `data/depolama.js` değişir.

## Modül biçimi

Manifest V3 içerik betikleri ES modülü olarak yüklenemez. Bu yüzden her dosya
kendini bir isim alanına yazan bir IIFE'dir:

```js
(function (global) {
  "use strict";
  const Motor = { /* ... */ };
  if (typeof module !== "undefined" && module.exports) module.exports = Motor; // Node testi
  global.Motor = Motor;                                                        // tarayıcı
})(typeof self !== "undefined" ? self : this);
```

Yükleme sırası bağımlılık sırasıdır ve üç yerde tekrar eder; birini değiştiren
diğerlerini de değiştirir:

| Bağlam | Sıra nerede |
|---|---|
| İçerik betiği | `manifest.json` → `content_scripts[].js` |
| Service worker | `importScripts(...)` |
| Popup | `popup.html` içindeki `<script src>` |

`scripts/manifest-denetle.mjs` bu yolların hepsinin var olduğunu ve pakete
girdiğini CI'da denetler.

## Uzantı bazında

| Uzantı | domain | data |
|---|---|---|
| Oto Çözücü | `cozucu_motoru.js`: 30+ çöz/kodla, okunabilirlik puanı, hash tanıma | `depolama.js` |
| Oto Çevirmen | `ceviri_motoru.js`: süzme, parçalama, istek adresi, yanıt çözme | `depolama.js`, `ceviri_servisi.js` (ağ yalnızca service worker'da) |
| Sola İtele | `itele_motoru.js`: kök CSS, fixed öğe yerleşimi | `depolama.js` |
| Voice Tamer | `ayarlar.js` (şema doğrulama), `kararlar.js` (RMS → dB) | `depolama.js` (localStorage), `ses_motoru.js` (Web Audio) |

Ayrıntılı tasarım notları her uzantının kendi README'sinde.
