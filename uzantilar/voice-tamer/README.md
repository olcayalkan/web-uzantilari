# Voice Tamer

YouTube seslerinde tiz/sibilans ("s", "ş" patlamaları) ve 2–4 kHz sertlik bastırıcı.
Rahatsız edici konuşmacı sesini, tonu boğmadan yumuşatır.
**Tamamen yerel:** ağ çağrısı, harici bağımlılık, telemetri yok.

## Kurulum (Brave / Chrome / Edge)

1. `brave://extensions` → sağ üstten **Geliştirici modu**
2. **Paketlenmemiş öğe yükle** → bu klasör (`uzantilar/voice-tamer/`) ya da
   [Releases](../../../../releases/latest)'tan indirip çıkardığın `voice-tamer` klasörü

- Araç çubuğu ikonu veya **Alt+Shift+V** → paneli aç/kapat
- Başlıktaki yeşil anahtar → işlemeyi baypas et (A/B karşılaştırma)
- Hazır ayarlar: **Hafif / Orta / Sert / Maks** — önce Orta'yı dene
- Turuncu çubuk de-esser'ın o an yaptığı kesimi gösterir

### Hangi kaydırıcı hangi derde

| Şikâyet | Kaydırıcı |
|---|---|
| Gırtlaktan gelen boğuk, hırıltılı tını | **Gırtlak azaltma** (%, varsayılan %80) + **Gırtlak frekansı** (350–600 Hz tara) |
| Hırıltının altındaki gümbürtü | **Alt kesim** — 100'den başlat, 130'a kadar çık |
| Ani ses patlamaları, baş ağrıtan çıkışlar | **Patlama bastırma** + **Patlama hassasiyeti** (asıl çare) |
| Patlamalar yakalanmıyor | **Patlama hassasiyeti**ni düşür — ×1.5'te %14, ×1.15'te %22 kare tetikleniyor |
| Sesini kontrol edemiyor, bir kısık bir bağırıyor | **Seviye sabitleme** + **Sıkıştırma** |
| "S/ş" sesleri kulağı tırmalıyor | **Tiz / S sesi kesme**, frekansı 6–8 kHz arasında gezdir |
| Genel olarak keskin, kulak tırmalayan | **Sertlik kesme** |

## İşleme zinciri

```
<video> → highpass ~100Hz → gırtlak (3 bileşen ~450Hz) → patlama filtresi ~1200Hz
        → peaking ~3.2kHz (sertlik) → dinamik de-esser ~7kHz
        → geniş bant kısma → kompresör → AGC → gain → limiter → hoparlör
```

Üç ayrı sorun, üç ayrı araç:

**Gırtlak / boğukluk** üç bileşenli bir modül. İstenen azaltmanın tamamını tek sabit
filtreyle yapmak sesin içini boşaltır, o yüzden bölünüyor: %60'ı sürekli taban,
%30'u üst formant (2× frekans, "honk"), %40'ı ise yalnızca gırtlak bandı baskın
olduğunda devreye giren dinamik ek. Sakin anlarda ses doğal kalır, gırtlak
bastırdığında hedefe tam ulaşılır. Eşik ölçümle belirlendi: düşük-orta/tam band
enerji oranı normal seste ~0.65, gırtlaklı seste ~0.87 — eşik 0.72.
Hırıltının altı ayrıca ayarlanabilir highpass ile temizleniyor.

**Ses patlamaları** için ayrı bir modül var. Gerçek bir videoda ölçüm yapıldı
(`DzLcUyjPljE`, 5:00–5:11): patlama anında 900–1500 Hz **+18.5 dB**, 1.5–2.5 kHz
+14.7 dB fırlıyor; 6–9 kHz ise **düşüyor**. Yani olay sibilans değil, orta bantta
yoğunlaşan seviye sıçraması. Dedektör anlık RMS'i yavaş zarfa oranlar (ölçülen
tepe/medyan = 3.0), eşik 1.5. Kesim ikiye bölünür: yarısı 1200 Hz'de geniş bir
peaking (Q 0.8), yarısı geniş bantta kısma — tek başına filtre yetmiyordu
(ölçüldü: 4.2 dB → 6.6 dB).

**Kontrolsüz seviye** için kompresör ani tepeleri yakalar, AGC uzun vadeli RMS
zarfını (~1 sn) düzler. AGC **yalnızca aşağı yönlüdür**: ölçümde yükseltmenin ters
teptiği görüldü (sakin bölümler yükselince yorgunluk artıyor), bu yüzden tavan 1.0.
Ses az gelirse Çıkış kaydırıcısı var. Sessizlikte devreye girmez.

**Sibilans** (s/ş patlamaları) kısa süreli olaylar olduğu için tek dinamik bileşen bu:
paralel bandpass + analyser ile sibilans/toplam enerji oranı ~16 ms'de bir ölçülüp
filtre kazancı anlık oynatılır (attack ~4 ms, release ~50 ms).

Analiz saati bir `ScriptProcessorNode`'un `onaudioprocess` olayıdır. Sebep: `setInterval`
arka plan sekmesinde 1 Hz'e kısılır (music.youtube.com senaryosu), Web Worker ise çözüm
değildir — content script'ten `new Worker()` çağrısı sayfanın CSP'sine tabi tutulur ve
YouTube hem `chrome-extension:` hem `blob:` worker'ı bloklar. `onaudioprocess` bir
zamanlayıcı değil, ses saatiyle sürülen bir olaydır: kısıtlanmaz, CSP'ye takılmaz.
Sıfır kazançlı bir yan kolda durur, sinyal yoluna dokunmaz.

## Güvenlik tasarımı

| Önlem | Nasıl |
|---|---|
| Kapsam | Yalnızca `youtube.com` (manifest `matches` + koddaki ikinci alan adı kilidi) |
| İzinler | `permissions` bloğu **yok** — `tabs`, `storage`, `webRequest`, `<all_urls>` hiçbiri |
| Ağ | `fetch`/`XHR`/`WebSocket`/`sendBeacon` yok, harici kaynak yok |
| Kod enjeksiyonu | `eval`, `new Function`, `innerHTML` yok — panel `DOMParser` ile kurulur (Trusted Types uyumlu) |
| Sayfadan izolasyon | Content script isolated world; panel **closed** shadow DOM |
| Bozuk/kötücül ayar | `localStorage` şemaya göre doğrulanır: bilinmeyen anahtar alınmaz, `__proto__` yok sayılır, her değer sınırına kırpılır |
| Duyma güvenliği | `output` kazancı 2.0'da sabit tavanlı; zincir sonunda limiter |
| Mesajlaşma | `chrome.runtime.onMessage` yalnızca kendi eklenti kimliğinden gelen mesajı kabul eder |
| Frame | `all_frames: false` — gömülü oynatıcılar tetiklemez |

## Test

```bash
node tests/test.js        # domain: ayar şeması + karar fonksiyonları (tarayıcısız)
node tests/calistir.mjs   # tests/test.html'i görünmez Chrome'da koşturur
```

Elle denemek için `python3 -m http.server 8777` (bu klasörde), sonra
`http://localhost:8777/tests/test.html` → **Testi başlat**.

64 doğrulama çalışır: ayar şeması ve prototype pollution savunması, alan adı kilidi,
panel kurulumu, zincirin video elementine bağlanması, üç filtrenin frekans tepkileri
(`getFrequencyResponse`), AGC'nin kısık/yüksek bölümlerdeki davranışı, Worker saatinin
hızı ve sentetik bir sibilans patlaması karşısında de-esser'ın tepkisi.

Son çalıştırma: **64 geçti / 0 kaldı**.

- De-esser: sibilans anında −11.4 dB, konuşma gövdesinde 0.0 dB
- Gırtlak modülü: gırtlak anında 450 Hz'de −14.8 dB (~%80), sakin anda −9.2 dB;
  2.5 kHz'de −0.7 dB, 3.5 kHz'de −0.4 dB (anlaşılabilirlik korunuyor)
- AGC: bağırma bölümünde ×0.34, kısık bölümde ×1.00 (yükseltmiyor), sessizlikte ×1.00
- Patlama bastırıcı, gerçek videoda (900–2500 Hz bandı, patlama anları):

| Ayar | Bant azalması | Tepe/medyan | Tetiklenen kare |
|---|---|---|---|
| Kontrol (kapalı) | 0.4 dB (ölçüm yanlılığı) | 10.8 → 10.1 | 50/526 |
| **Orta** | 1.5 dB | **10.7 → 5.7** | 72/525 |
| **Maks** | **12.2 dB** | 10.9 → 7.9 | 116/525 |

Rakamlar koşudan koşuya oynuyor (bant ortalaması ~70 kare üzerinden alınıyor, oynatma
tam aynı karede başlamıyor). Sağlam olan sonuç: her iki ayar da açık farkla çalışıyor,
Maks bandı en çok kısan, Orta ise dinamik farkı en çok daraltan ayar. Maks'ta kompresör
20:1'e çıktığı için bant çok kısılıyor ama genel dinamik daha az düzeliyor.

Ek denetim:

```bash
npx addons-linter .
```

Çıkan 3 bulgu Firefox mağaza kurallarıdır (add-on ID, Firefox geri dönüşü,
veri toplama anahtarı) ve yerel Chromium kurulumunu ilgilendirmez.
Kod seviyesinde bulgu yoktur.

## Dosyalar

```
manifest.json                         # MV3
icons/                                # yerel üretilmiş ikonlar
src/
├── core/sabitler.js                  # ayar şeması, kalibrasyon eşikleri, hazır ayarlar
├── features/ses/
│   ├── domain/
│   │   ├── ayarlar.js                # şema doğrulama (pollution savunması, kırpma)
│   │   └── kararlar.js               # saf karar fonksiyonları: RMS -> dB / kazanç
│   ├── data/
│   │   ├── depolama.js               # localStorage sarmalayıcı
│   │   └── ses_motoru.js             # Web Audio zinciri + analiz saati
│   └── presentation/content/
│       ├── panel.js                  # kapalı shadow DOM panel
│       ├── content.js                # giriş: alan adı kilidi, katmanları bağlar
│       └── kopru.js                  # ikon/kısayol mesajı -> panel
└── background/service_worker.js      # ikon/kısayol -> sekmeye mesaj
tests/
├── test.js                           # domain testleri (Node)
├── test.html                         # DSP test paketi (tarayıcı)
└── calistir.mjs                      # test.html'i görünmez Chrome'da çalıştırır
```

**Katman kuralı:** `domain` Web Audio ve DOM bilmez, ölçülmüş değeri alır, karar
döndürür. `data/ses_motoru.js` bu kararları ses düğümlerine uygular. Panel ses
motorunu tanımaz; ayarı değiştirip `uygula` geri çağrısıyla haber verir.


## Frekans dengeleyici — ölçüm ve sınırları

9 bantlı bir spektral leveler (200 Hz – 6.4 kHz). Her bant kendi son ortalamasını
tutar; anlık seviye ortalamanın üstüne çıkınca o bant o kadar kısılır. Amaç, tınının
anlık sapmalarını düzleştirmek.

Gerçek videoda ölçüldü (`DzLcUyjPljE`, 8:40–9:00, konuşma kapısıyla — sessizlikler
metriği şişirmesin diye elendi). Metrik: bant seviyesinin standart sapması.

| Ayar | Dalgalanma | Düzelme |
|---|---|---|
| Kapalı (kontrol) | 6.84 dB | — |
| **Tek yönlü** (yalnız tepeleri kes) | 6.28 dB | **0.56 dB** |
| Çift yönlü (tepeyi kes + çukuru doldur) | 6.63 dB | 0.21 dB |

**Çift yönlü daha kötü çıktı**, o yüzden modül tek yönlü bırakıldı: çukurları
doldurmak kendi modülasyonunu ekliyor ve düzeltme gecikmeli geldiği için toplam
sapmayı artırıyor.

**Dürüst sınır:** 6.84 dB'lik dalgalanmanın ancak 0.56 dB'si alınabiliyor (~%8).
Sebebi şu: bu dalgalanmanın büyük kısmı konuşmanın kendisi. Farklı ünlü ve ünsüzlerin
spektrumu doğal olarak birbirinden çok farklı ve bu fark anlam taşıyor. 3 saniyelik
hafızası olan bir dengeleyici, "rahatsız edici oynama" ile "normal fonem değişimi"
arasındaki farkı ayırt edemez. Daha fazla düzleştirmek konuşmayı robotlaştırır ve
anlaşılmaz hale getirir.

Ölçülerek işe yaradığı gösterilen modüller: patlama bastırıcı, gırtlak modülü ve
aşağı yönlü AGC. Dengeleyici bunların üstüne küçük ama gerçek bir katkı veriyor.
