# Kurulum

Her uzantının adım adım kurulum videosu: [docs/videolar/](videolar/) ve uzantının kendi README'si.

## İlk yükleme

1. [Releases](https://github.com/olcayalkan/web-uzantilari/releases/latest) sayfasından
   uzantının zip'ini indir.
2. Zip'i kalıcı bir klasöre çıkar (ör. `Belgeler/Uzantilar/sola-itele`).
   Tarayıcı uzantıyı her açılışta bu klasörden okur; klasörü silersen uzantı da çalışmaz.
3. Uzantılar sayfasını aç: sağ üstteki **⋮** menüsü → **Uzantılar** → **Uzantıları yönet**.
   Adres çubuğuna yazmak da olur:

   | Tarayıcı | Adres |
   |---|---|
   | Chrome, Chromium | `chrome://extensions` |
   | Brave | `brave://extensions` |
   | Edge | `edge://extensions` |

4. **Geliştirici modu** anahtarını aç (Chrome ve Brave'de sağ üstte, Edge'de sol menüde).
5. **Paketlenmemiş öğe yükle** düğmesine bas, çıkardığın klasörü seç.
6. Araç çubuğundaki yapboz simgesinden uzantıyı sabitle.
7. Önceden açık olan sekmeleri yenile: içerik betikleri yalnızca yeni yüklenen
   sayfalara girer.

## Güncelleme

1. Yeni zip'i indir ve **aynı klasörün üzerine** çıkar.
2. Uzantılar sayfasında uzantının kartındaki ↻ düğmesine bas.
3. Açık sekmeleri yenile.

Klasör aynı kaldığı sürece ayarların korunur.

## Kaldırma

Uzantılar sayfasında karttaki **Kaldır** düğmesine bas, sonra klasörü sil.

## Sık sorunlar

| Belirti | Neden ve çözüm |
|---|---|
| "Manifest dosyası eksik" | Yanlış klasör seçildi. İçinde `manifest.json` olan klasörü seç; zip bazen bir üst klasör daha açar. |
| Uzantı bir sayfada çalışmıyor | Sayfa uzantı yüklenmeden önce açılmıştı, yenile. `chrome://` sayfalarında ve Web Mağazası'nda hiçbir uzantı çalışamaz. |
| Oto Çevirmen "Çok fazla istek" diyor | Google'ın anahtarsız uç noktası hız sınırı uyguluyor. Biraz bekle. |
| Oto Çevirmen "Uzantıya ulaşılamadı" diyor | Uzantı güncellendi, eski sekmedeki betik yetim kaldı. Sayfayı yenile. |
| Oto Çevirmen kısayolu çalışmıyor | Kısayol Windows ve Linux'ta **Alt+Shift+Y**, macOS'ta **Alt+Shift+T**. Daha önce kurulmuş uzantıda `chrome://extensions/shortcuts` sayfasından atanır. |
| Linux'ta klasör seçilemiyor | Snap ile kurulan Chromium gizli klasörlere erişemez. Zip, `~/Belgeler` gibi görünür bir klasöre çıkarılır. |
| Voice Tamer paneli görünmüyor | Araç çubuğu simgesine bas ya da **Alt+Shift+V**. Yalnızca YouTube'da çalışır. |
