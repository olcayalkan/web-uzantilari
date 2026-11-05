# Kullanım

## Panel

Araç çubuğundaki simgeye tıklayınca panel açılır.

| Öğe | İşlev |
|---|---|
| Anahtar | İtelemeyi açar veya kapatır. Açıkken simgede **AÇIK** rozeti görünür. |
| Kaydırıcı | Sayfanın kullanacağı genişliği %30–%95 arasında, 5'er adımla ayarlar. |
| %50 / %60 / %70 / %80 | Sık kullanılan oranları tek tıkla seçer. |

Ayarlar tüm sekmelere ve sitelere birlikte uygulanır. Değişiklik açık sekmelere sayfa yenilenmeden yansır. Ayarlar tarayıcı kapatılıp açıldığında korunur.

## Oranın anlamı

Oran, **pencere** genişliğine göre hesaplanır. Pencere tam ekransa bu ekranın oranıyla aynıdır. Örneğin 1920px genişliğindeki pencerede %70, sayfanın 1344px kullanması demektir.

## Sayfada ne değişir

- Sayfanın kökü (`html`) seçilen orana daraltılır ve sola yaslanır.
- Ekrana sabitlenmiş öğeler (`position: fixed`) de bu alana alınır:
  - Tam genişlikteki üst menü veya alt şerit daraltılır.
  - Sağ köşedeki sohbet balonu gibi öğeler, sağ kenara olan uzaklıkları korunarak sınırın içine çekilir.
  - Ortadaki açılır pencereler sol alanın ortasına taşınır.
- Sonradan açılan menüler ve pencere boyutunun değişmesi takip edilir (~250 ms gecikmeyle).

## Bilinen sınırlar

- Sağdaki boş alanda sitenin kendi arka plan rengi görünür.
- Siteler duyarlı tasarım kırılımlarını (media query) hâlâ tam pencere genişliğine göre seçer. En az tam genişlik varsayan nadir sitelerde içerik sağa taşabilir. İçerik kaybolmasın diye bu taşma kesilmez.
- `100vw` genişlik kullanan öğeler sağa taşabilir.
- `chrome://` sayfalarında ve Chrome Web Mağazası'nda eklentiler çalışamaz.
- Yalnızca ana sayfa çerçevesine uygulanır, sayfa içindeki iframe'lere uygulanmaz.
