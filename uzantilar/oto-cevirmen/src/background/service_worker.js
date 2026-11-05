// Arka plan servisi: tüm çeviri istekleri buradan geçer (CSP/CORS'tan bağımsız),
// sağ tık menüsü ve klavye kısayolunu sayfadaki balona yönlendirir.
importScripts(
  "../core/sabitler.js",
  "../features/ceviri/domain/ceviri_motoru.js",
  "../features/ceviri/data/depolama.js",
  "../features/ceviri/data/ceviri_servisi.js"
);

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "cevir-secim", title: "Türkçeye çevir: “%s”", contexts: ["selection"] });
  // Simgeye sağ tık: popup açmadan aç/kapa. İşaret durumu durumGoster() eşitler.
  chrome.contextMenus.create({ id: "otomatik", title: "Seçince otomatik çevir", type: "checkbox", checked: true, contexts: ["action"] });
  Depolama.otomatikYukle(durumGoster);
});

// Açık/kapalı durum araç çubuğunda her an görünsün. Rozet Sola İtele ile
// birebir aynı (varsayılan renkte "AÇIK"); iki uzantı yan yana tutarlı dursun.
// "KAPALI" rozete sığmadığı için kapalı durumu gri simge taşır.
function durumGoster(acik) {
  const ek = acik ? "" : "-kapali";
  chrome.action.setIcon({ path: { 16: "/icons/icon16" + ek + ".png", 48: "/icons/icon48" + ek + ".png", 128: "/icons/icon128" + ek + ".png" } });
  chrome.action.setBadgeText({ text: acik ? "AÇIK" : "" });
  chrome.action.setTitle({ title: "Oto Çevirmen — " + (acik ? "Açık" : "Kapalı") });
  chrome.contextMenus.update("otomatik", { checked: acik }, () => void chrome.runtime.lastError);
}

// setIcon/rozet tarayıcı yeniden açılınca ya da eklenti yenilenince sıfırlanır.
// Olaylara güvenmek yerine SW her uyandığında durumu yeniden çiz; ucuz bir çağrı.
chrome.runtime.onStartup.addListener(() => Depolama.otomatikYukle(durumGoster));
Depolama.otomatikYukle(durumGoster);
Depolama.otomatikIzle(durumGoster);

chrome.runtime.onMessage.addListener((mesaj, _gonderen, yanitla) => {
  if (!mesaj || mesaj.tur !== Sabitler.MESAJ.cevir) return;
  CeviriServisi.cevir(mesaj.metin)
    .then((sonuc) => yanitla({ tamam: true, sonuc }))
    .catch((h) => yanitla({ tamam: false, hata: h.message || String(h) }));
  return true; // yanıt asenkron gelecek; kanal açık kalsın
});

// Menü ve kısayol, otomatik mod kapalıyken de çevirebilmek için var. Sayfadaki
// content script seçimin konumunu bildiği için balonu o çizer.
function sekmeyeIlet(sekme, metin) {
  if (!sekme || sekme.id == null) return;
  chrome.tabs.sendMessage(sekme.id, { tur: Sabitler.MESAJ.kisayol, metin }, () => {
    // Content script yoksa (chrome://, Web Mağazası, PDF) popup'a devret.
    if (chrome.runtime.lastError && metin) {
      Depolama.secimKaydet(metin);
      // openPopup eski Chrome'larda yok ya da kullanıcı hareketi ister; olmazsa
      // seçim yine saklı, simgeye tıklayınca popup onu açar.
      try { chrome.action.openPopup().catch(() => {}); } catch (_) {}
    }
  });
}

chrome.contextMenus.onClicked.addListener((bilgi, sekme) => {
  if (bilgi.menuItemId === "cevir-secim" && bilgi.selectionText) sekmeyeIlet(sekme, bilgi.selectionText);
  // Kayıt onChanged'i tetikler; simge ve sekmeler oradan güncellenir.
  if (bilgi.menuItemId === "otomatik") Depolama.otomatikKaydet(bilgi.checked);
});

chrome.commands.onCommand.addListener((komut, sekme) => {
  if (komut === "secimi-cevir") sekmeyeIlet(sekme, null);
});
