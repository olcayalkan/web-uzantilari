// Popup: otomatik modu aç/kapat + elle çeviri kutusu. Ağ isteği yine SW'den geçer
// ki önbellek ve hata mesajları sayfa-içi balonla aynı olsun.

const otomatikEl = document.getElementById("otomatik");
const girdiEl = document.getElementById("girdi");
const durumEl = document.getElementById("durum");
const sonucEl = document.getElementById("sonuc");
const dilEl = document.getElementById("dil");
const ciktiEl = document.getElementById("cikti");
const kopyalaBtn = document.getElementById("kopyala");

let zamanlayici = null;
let istekNo = 0;

function durum(yazi, hata) {
  durumEl.textContent = yazi || "";
  durumEl.classList.toggle("hata", !!hata);
}

function cevir() {
  const metin = girdiEl.value.trim();
  const no = ++istekNo;
  sonucEl.hidden = true;
  if (!metin) { durum(""); return; }
  if (!CeviriMotoru.uygunMu(metin)) {
    durum(metin.length > Sabitler.MAKS_GIRDI ? "Metin çok uzun (en fazla " + Sabitler.MAKS_GIRDI + " karakter)." : "Çevrilecek harf yok.");
    return;
  }
  durum("Çevriliyor…");
  chrome.runtime.sendMessage({ tur: Sabitler.MESAJ.cevir, metin }, (yanit) => {
    if (no !== istekNo) return;
    if (chrome.runtime.lastError || !yanit) { durum("Arka plan servisine ulaşılamadı.", true); return; }
    if (!yanit.tamam) { durum(yanit.hata, true); return; }
    const { ceviri, kaynakDil } = yanit.sonuc;
    durum(kaynakDil === Sabitler.HEDEF_DIL ? "Metin zaten Türkçe görünüyor." : "");
    dilEl.textContent = CeviriMotoru.dilAdi(kaynakDil) + " → Türkçe";
    ciktiEl.textContent = ceviri;
    sonucEl.hidden = false;
  });
}

girdiEl.addEventListener("input", () => {
  clearTimeout(zamanlayici);
  // Her tuşta istek atmak hız sınırına takılır; yazma durunca çevir.
  zamanlayici = setTimeout(cevir, 400);
});

kopyalaBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(ciktiEl.textContent).then(() => {
    kopyalaBtn.textContent = "✓";
    setTimeout(() => (kopyalaBtn.textContent = "Kopyala"), 1200);
  });
});

const durumYaziEl = document.getElementById("durumYazi");
const aciklamaEl = document.getElementById("aciklama");

function durumGoster(acik) {
  otomatikEl.checked = acik;
  durumYaziEl.textContent = acik ? "AÇIK" : "KAPALI";
  durumYaziEl.classList.toggle("acik", acik);
  aciklamaEl.textContent = acik
    ? "Sayfada metin seçince çeviri kendiliğinden açılır."
    : "Otomatik çeviri kapalı. Kısayol ve sağ tık yine çalışır.";
}

Depolama.otomatikYukle(durumGoster);
otomatikEl.addEventListener("change", () => {
  durumGoster(otomatikEl.checked);
  Depolama.otomatikKaydet(otomatikEl.checked);
});

// İçerik betiği olmayan sayfalardan (chrome://, PDF) sağ tıkla gelen seçim.
Depolama.secimYukle((secim) => {
  if (!secim) return;
  Depolama.secimTemizle();
  girdiEl.value = secim;
  cevir();
});

girdiEl.focus();
