# Güvenlik

## Açık bildirmek

Bir uzantıda güvenlik açığı bulduysan herkese açık issue açma. GitHub'ın
**Security → Report a vulnerability** (özel bildirim) özelliğini kullan.

Bildirimde şunlar olsun: hangi uzantı ve sürüm, açığı tetikleyen adımlar, beklenen
ve gerçekleşen davranış.

## Kapsam

| Kapsamda | Kapsam dışı |
|---|---|
| Uzantının sayfaya veri sızdırması, sayfanın uzantıya kod enjekte edebilmesi | Google Translate'in kendi davranışı |
| İzinlerin belgelenenden geniş kullanılması | `chrome://` sayfalarında çalışmama (tarayıcı kısıtı) |
| Depolanan ayarın kötüye kullanılabilmesi | |
