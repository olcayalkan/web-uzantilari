# Mimari

## Bileşenler

```
           ┌────────────────────────┐
           │  popup (panel)         │  kullanıcı oranı / durumu değiştirir
           │  presentation/popup    │
           └───────────┬────────────┘
                       │ chrome.storage.local.set({ acik, oran })
                       ▼
           ┌────────────────────────┐
           │  chrome.storage.local  │  { acik: boolean, oran: 0.3–0.95 }
           └─────┬────────────┬─────┘
     onChanged   │            │   onChanged
                 ▼            ▼
┌──────────────────────┐  ┌──────────────────────────────┐
│ src/background/      │  │ presentation/content         │
│ service_worker.js    │  │ (her sekmede, document_start)│
│ simge rozeti: AÇIK   │  │ sayfayı sola iter            │
└──────────────────────┘  └──────────────────────────────┘
```

Bileşenler birbirine doğrudan mesaj göndermez. Tek ortak nokta `chrome.storage.local` kaydıdır ve ona yalnızca `data/depolama.js` dokunur. Panel yazar, diğerleri `Depolama.izle` ile dinler.

Hesap ile uygulama ayrıdır: hangi öğenin nereye taşınacağına `domain/itele_motoru.js` karar verir (saf, Node ile test edilir), `presentation/content/content.js` ölçer ve sonucu satır içi stil olarak yazar.

## Saklanan veriler

| Anahtar | Tür | Varsayılan | Açıklama |
|---|---|---|---|
| `acik` | boolean | `false` | İteleme açık mı |
| `oran` | number | `0.7` | Sayfanın kullanacağı pencere oranı |

## İçerik betiği nasıl çalışır

1. **Kök daraltma:** Sayfaya `<style id="sola-itele-stil">` eklenir. `html` öğesine `width: <oran>%`, `margin: 0` ve `position: relative` verilir. `position: relative` sayesinde konumlu atası olmayan `absolute` öğeler de daraltılmış alana göre yerleşir.
2. **Fixed öğeleri sığdırma (`fixedleriSigdir` → `IteleMotoru.fixedYerlesim`):** `position: fixed` öğeler `html` genişliğini değil pencereyi esas alır. Bu yüzden `body` içindeki her fixed öğe ölçülür ve sınırı aşan ya da ortalanmış olanlar üç türe ayrılır:

   | Tür | Nasıl anlaşılır | Ne yapılır |
   |---|---|---|
   | Ortalanmış / tam genişlik | Sol ve sağ boşluk eşit (±2px) | Sol alanın ortasına alınır, gerekirse sınıra daraltılır |
   | Sola dayalı | Sol boşluk sağdakinden küçük | Sol konumu korunur, sağ kenarı sınıra çekilir |
   | Sağa dayalı | Sağ boşluk soldakinden küçük | Sağ kenar uzaklığı korunarak sınırın içine kaydırılır |

   Değişiklikler satır içi stil olarak `!important` ile yazılır. Her öğenin eski satır içi değerleri `ayarlananlar` haritasında tutulur.
3. **Yeniden tarama (`tara`):** Önce tüm değişiklikler geri alınır, sonra öğeler yeniden ölçülür. Böylece öğenin özgün konumu her seferinde doğru hesaplanır. Tarama şu durumlarda 250 ms gecikmeyle tekrarlanır:
   - DOM'a öğe eklenmesi/çıkarılması veya `class`/`style` değişmesi (`MutationObserver`)
   - Pencere boyutunun değişmesi
   - Oranın değişmesi

   Eklentinin kendi stil değişiklikleri gözlemciyi tetiklemesin diye tarama sırasında gözlemci durdurulur.
4. **Kapatma:** Stil etiketi kaldırılır, tüm fixed öğelerin satır içi değerleri eski hâline getirilir, gözlemci ve `resize` dinleyicisi kapatılır.
