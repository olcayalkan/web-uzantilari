# Kurulum

## İlk yükleme

1. Chrome'da `chrome://extensions` adresini açın.
2. Sağ üstteki **Geliştirici modu** anahtarını açın.
3. **Paketlenmemiş öğe yükle** düğmesine basın ve `sola-itele` klasörünü seçin (`manifest.json` dosyasının bulunduğu klasör).
4. Araç çubuğundaki yapboz simgesinden Sola İtele'yi sabitleyin.

Eklenti yüklenmeden önce açık olan sekmelerde çalışması için o sekmeleri yenileyin.

## Güncelleme

Dosyalarda değişiklik yaptıktan sonra `chrome://extensions` sayfasında Sola İtele kartındaki ↻ düğmesine basın, ardından açık sekmeleri yenileyin.

## İzinler

| İzin | Neden |
|---|---|
| `storage` | Açık/kapalı durumunu ve oranı saklamak |
| `<all_urls>` (içerik betiği) | İtelemeyi her sitede uygulayabilmek |

Eklenti ağ isteği yapmaz, sayfa içeriğini okumaz veya bir yere göndermez.

## Kaldırma

`chrome://extensions` sayfasında karttaki **Kaldır** düğmesine basın. Kayıtlı ayarlar da silinir.
