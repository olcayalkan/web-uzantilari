# Oto Çözücü — CTF Kodlama/Şifre Chrome Uzantısı

Kodlanmış/şifreli metni **otomatik tanıyıp çözer** (decrypt) ve seçili yöntemle
**kodlar** (encrypt). Önce hangi kodlama olduğunu puanlayarak tespit eder, sonra
çözümü gösterir. CyberChef "Magic" mantığına benzer; çok katlı kodlamayı katman
katman açar (ör. Base64 → Hex → `flag{...}`).

> Not: "hash" (MD5/SHA/bcrypt) tek yönlüdür, geri çözülemez. Bu araç
> **geri çevrilebilir kodlamalar ve klasik şifreler** içindir. AES/RSA gibi
> modern şifreler ayrı araç (Python/Sage) işidir.

## İki mod

- **🔓 Çöz (decrypt):** metni yapıştır → tüm olası çözümler puan sırasıyla listelenir.
- **🔒 Kodla (encrypt):** yöntemi seç → metin o yöntemle kodlanır. Ayrıca
  "Caesar — tüm kaydırmalar" yöntemi 25 ROT'u tek bakışta listeler (CTF göz taraması).

## Desteklenen yöntemler (30+)

**Kodlamalar:** Base64/URL, Base32, Base58, Base62, Base85/Ascii85, Base45, basE91,
Hex, Octal, Ondalık ASCII, Binary, URL, HTML varlıkları, Unicode kaçış, Quoted-Printable.

**Görsel/fonetik:** Morse, Baconian, Tap code, A1Z26, NATO fonetik, Leetspeak,
Polybius karesi, Ters çevirme.

**Klasik şifreler:** ROT13, ROT47, Atbash, Caesar (kaydırma), Affine, Vigenère,
Gronsfeld, Playfair, Bifid, Railfence (zigzag), XOR.

**Diğer:** JWT (header + payload çözme). **Hash tanıma:** MD5, SHA-1/224/256/384/512,
NTLM, bcrypt, Argon2, sha*crypt, LDAP (S)SHA, DES crypt — tür tahmini (hash geri
çözülemez; Çöz modunda bilgi kartı olarak çıkar).

## Anahtar/parametre

Anahtar gerektiren yöntemlerde **anahtar alanı** kullanılır:

| Yöntem | Anahtar | Anahtarsız davranış |
|---|---|---|
| Vigenère | anahtar kelime | — (anahtar şart) |
| Gronsfeld | rakamlar (ör. 31415) | — (anahtar şart) |
| Playfair | anahtar kelime | — (anahtar şart) |
| Bifid | anahtar kelime | — (anahtar şart) |
| XOR | anahtar (hex girdi önerilir) | tek-bayt brute |
| Caesar | kaydırma sayısı (ör. 3) | 25 kaydırma brute |
| Affine | `a,b` (ör. 5,8) | tüm (a,b) brute |
| Railfence | ray sayısı (ör. 3) | 2–12 ray brute |

Çöz modunda anahtar verirsen o yöntem öncelik kazanır; vermezsen brute ile
en okunabilir sonuç bulunur.

## Nasıl sıralanır (otomatik tanıma)

Her çözücü girdiye uygulanır; çıktı **doğal dil benzerliğine** göre puanlanır:
yazdırılabilirlik + harf/sesli oranı + rakam-sembol cezası + yaygın harf-ikilisi
(İngilizce/Türkçe bigram) frekansı. Biçime uyması gereken yapısal çözücüler
(Base64, Hex, JWT...) güven bonusu alır. Çıktısı **temiz başka bir kodlama** olan
çözümler (çok katlı ara-katman) öne çıkar. ROT13/Atbash gibi her girdide "çalışan"
şifreler ceza alır.

## Kullanım

- **Simgeye tıkla** → mod seç → metni yapıştır (ya da **📋 Panodan al**).
- **Sayfada metin seç** → en olası çözüm küçük bir balonda anında çıkar (Esc/dışarı
  tıkla ile kapanır). Yalnızca güvenilir çözümlerde gösterilir.
  Popup başlığındaki anahtarla açılıp kapanır; açıkken simgede **AÇIK** rozeti görünür.
- **Seç → sağ tık → "Seçimi çöz"** → bildirimde en olası çözüm; simgeye tıklayınca tam liste.

> İzin notu: sayfa-içi seçim özelliği için uzantı tüm sayfalarda çalışan bir
> content script içerir (`<all_urls>`). Veri hiçbir yere gönderilmez; tüm çözme
> işlemi yerelde, tarayıcıda yapılır.

## Kurulum (geliştirici modu)

1. Chrome'da `chrome://extensions` aç.
2. Sağ üstten **Geliştirici modu**'nu aç.
3. **Paketlenmemiş öğe yükle** → bu klasörü (`oto-cozucu/`) ya da
   [Releases](https://github.com/olcayalkan/web-uzantilari/releases/latest)'tan indirip çıkardığın `oto-cozucu` klasörünü seç.

## Paketleme

Yüklenebilir/dağıtılabilir `.zip` üretmek için:

Depo kökünden:

```bash
scripts/paketle.sh   # tüm uzantılar → dist/<ad>.zip
```

Zip yalnızca çalışma-zamanı dosyalarını (`manifest.json`, `icons/`, `src/`) içerir;
test, README ve geliştirme dosyaları hariç.

## Proje yapısı (Clean Architecture)

Kod, katmanlara ayrılmış bir `src/` ağacında; her katman tek bir sorumluluk taşır
ve yalnızca içteki katmana bağımlıdır (domain hiçbir şeye bağımlı değil).

```
manifest.json                         # MV3 — Chrome'un zorunlu kıldığı kök
icons/                                # Simgeler
tests/test.js                         # Motor test paketi (node tests/test.js)
src/
├── core/
│   └── sabitler.js                   # Paylaşılan sabitler (depo anahtarları, eşikler)
├── features/
│   └── cozucu/
│       ├── domain/
│       │   └── cozucu_motoru.js      # Saf iş mantığı: tanıma + çöz/kodla + hash tanıma
│       ├── data/
│       │   └── depolama.js           # Veri kaynağı: chrome.storage sarmalayıcı
│       └── presentation/
│           ├── popup/                # popup.html / .css / .js  (iki modlu arayüz)
│           └── content/
│               └── content.js        # Sayfa-içi seçim balonu
└── background/
    └── service_worker.js             # Sağ tık menüsü + bildirim
```

**Katman kuralı:** `presentation` ve `background`, `domain`'i (motor) ve `data`'yı
(depolama) kullanır; `domain` tamamen bağımsız ve saf (chrome API'si yok), bu yüzden
Node ile doğrudan test edilebilir. Depolama erişimi yalnızca `data` katmanından geçer.

## Test

```bash
node tests/test.js
```

Tek bir çözümü elle denemek için:

```bash
node -e "
global.self = global;
global.atob = (s) => Buffer.from(s, 'base64').toString('binary');
global.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
const C = require('./src/features/cozucu/domain/cozucu_motoru.js');
console.log(C.coz('TWVyaGFiYQ==')[0]);    // Base64 -> Merhaba
console.log(C.kodla('merhaba', 'ROT13'));  // zreunon
"
```
