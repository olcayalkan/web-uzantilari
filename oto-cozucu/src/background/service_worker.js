// Arka plan servisi: sağ tık menüsü, seçimi doğrudan çözüp bildirim gösterir, simge rozetini (AÇIK) günceller.
// Firefox'ta arka plan bir sayfadır, importScripts yoktur; dosyaları manifest yükler.
if (typeof importScripts === "function") importScripts(
  "../features/cozucu/domain/cozucu_motoru.js",
  "../core/sabitler.js",
  "../features/cozucu/data/depolama.js"
);

// Rozet, sayfada seçince otomatik çözme açık mı onu simgeden belli eder.
const rozet = (acik) => chrome.action.setBadgeText({ text: acik ? "AÇIK" : "" });
const rozetiYenile = () => Depolama.acikYukle(rozet);

chrome.runtime.onStartup.addListener(rozetiYenile);
Depolama.acikDinle(rozet);

chrome.runtime.onInstalled.addListener(() => {
  rozetiYenile();
  chrome.contextMenus.create({
    id: "coz-secim",
    title: "Seçimi çöz: “%s”",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((bilgi) => {
  if (bilgi.menuItemId !== "coz-secim" || !bilgi.selectionText) return;
  const secim = bilgi.selectionText;

  // Seçimi sakla ki popup açıldığında tüm sonuç listesini gösterebilsin (data katmanı).
  Depolama.secimKaydet(secim);

  const liste = Cozucu.coz(secim);
  if (liste.length === 0) {
    bildir("Oto Çözücü", "Tanınan bir kodlama bulunamadı.");
    return;
  }
  const en = liste[0];
  const kisa = en.cikti.length > 180 ? en.cikti.slice(0, 180) + "…" : en.cikti;
  bildir(en.yontem + " olarak çözüldü", kisa);
});

function bildir(baslik, mesaj) {
  chrome.notifications?.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: baslik,
    message: mesaj
  });
}
