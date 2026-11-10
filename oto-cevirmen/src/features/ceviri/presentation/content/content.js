// Sayfa-içi çevirmen: kullanıcı metin seçince çeviriyi seçimin altında bir
// balonda gösterir. Balon kapalı Shadow DOM içinde olduğu için sayfa CSS'i ona,
// onun CSS'i de sayfaya sızmaz. Ağ isteğini service worker yapar.

(function () {
  "use strict";
  if (window.__ceviriYuklu) return; // iki kez enjekte olursa tekrar kurma
  window.__ceviriYuklu = true;

  const S = window.Sabitler;
  const M = window.CeviriMotoru;

  let otomatik = true;
  Depolama.otomatikYukle((v) => { otomatik = v; });
  Depolama.otomatikIzle((v) => { otomatik = v; if (!v) kapat(); });

  let konak = null;   // shadow host, sayfadaki tek elementimiz
  let kok = null;     // shadow root
  let gosterilen = ""; // açık balondaki kaynak metin; aynı seçimi tekrar çevirmemek için
  let istekNo = 0;    // yavaş gelen eski yanıt yeni balonu ezmesin

  const STIL = `
    :host { all: initial; }
    .balon {
      position: fixed; z-index: 2147483647; box-sizing: border-box;
      max-width: 360px; min-width: 160px; max-height: 300px; overflow: auto;
      background: #1e1e2e; color: #e4e4ef; border: 1px solid #3a3d4d;
      border-radius: 10px; padding: 8px 10px 8px;
      font: 13px/1.5 -apple-system, "Segoe UI", system-ui, sans-serif;
      box-shadow: 0 6px 24px rgba(0,0,0,.35);
      animation: gir .12s ease-out;
    }
    @keyframes gir { from { opacity: 0; transform: translateY(-3px); } }
    .ust { display: flex; align-items: center; gap: 6px; margin-bottom: 4px;
           font-size: 11px; color: #9aa0b4; user-select: none; }
    .ust .dil { flex: 1; }
    .metin { white-space: pre-wrap; word-break: break-word; user-select: text; }
    .metin.hata { color: #ff6e6e; }
    .metin.yukleniyor { color: #9aa0b4; font-style: italic; }
    button { all: unset; cursor: pointer; font-size: 11px; color: #9aa0b4;
             padding: 1px 6px; border-radius: 5px; border: 1px solid transparent; }
    button:hover { color: #8be9fd; border-color: #3a3d4d; }
    @media (prefers-color-scheme: light) {
      .balon { background: #ffffff; color: #1d1d24; border-color: #d6d8e0;
               box-shadow: 0 6px 24px rgba(0,0,0,.15); }
      button:hover { color: #0a66c2; border-color: #d6d8e0; }
    }
  `;

  function kapat() {
    if (konak) konak.remove();
    konak = kok = null;
    gosterilen = "";
    istekNo++;
  }

  // innerWidth klasik kaydırma çubuğunu da (Windows, Linux) sayar; balon çubuğun altına girmesin.
  function gorunurAlan() {
    const k = (document.compatMode === "BackCompat" && document.body) || document.documentElement;
    return { gen: k.clientWidth || window.innerWidth, yuk: k.clientHeight || window.innerHeight };
  }

  // Balonu seçimin altına koy; ekran altına taşarsa üstüne al.
  function konumla(balon, kutu) {
    const alan = gorunurAlan();
    const gen = Math.min(360, alan.gen - 16);
    const x = Math.max(8, Math.min(kutu.left, alan.gen - gen - 8));
    balon.style.left = x + "px";
    balon.style.top = (kutu.bottom + 8) + "px";
    const yuk = balon.getBoundingClientRect().height;
    if (kutu.bottom + 8 + yuk > alan.yuk && kutu.top - 8 - yuk > 0) {
      balon.style.top = (kutu.top - 8 - yuk) + "px";
    }
  }

  function balonCiz(kutu, ustYazi, govde, durum) {
    if (!konak) {
      konak = document.createElement("ceviri-balonu");
      kok = konak.attachShadow({ mode: "closed" });
      (document.body || document.documentElement).appendChild(konak);
    }
    kok.innerHTML = "";
    const stil = document.createElement("style");
    stil.textContent = STIL;

    const balon = document.createElement("div");
    balon.className = "balon";
    const ust = document.createElement("div");
    ust.className = "ust";
    const dil = document.createElement("span");
    dil.className = "dil";
    dil.textContent = ustYazi;
    ust.append(dil);

    if (durum === "tamam") {
      const kopyala = document.createElement("button");
      kopyala.textContent = "Kopyala";
      kopyala.addEventListener("click", () => {
        navigator.clipboard.writeText(govde).then(() => {
          kopyala.textContent = "✓ Kopyalandı";
          setTimeout(() => { kopyala.textContent = "Kopyala"; }, 1200);
        }).catch(() => { kopyala.textContent = "Kopyalanamadı"; });
      });
      ust.append(kopyala);
    }
    const kapatBtn = document.createElement("button");
    kapatBtn.textContent = "✕";
    kapatBtn.title = "Kapat (Esc)";
    kapatBtn.addEventListener("click", kapat);
    ust.append(kapatBtn);

    const metin = document.createElement("div");
    metin.className = "metin" + (durum === "hata" ? " hata" : durum === "yukleniyor" ? " yukleniyor" : "");
    metin.textContent = govde;

    balon.append(ust, metin);
    kok.append(stil, balon);
    konumla(balon, kutu);
  }

  // input/textarea içindeki seçim window.getSelection()'da görünmediği için ayrıca okunur.
  function secimiAl() {
    const etkin = document.activeElement;
    if (etkin && (etkin.tagName === "TEXTAREA" || (etkin.tagName === "INPUT" && /^(text|search|url|)$/i.test(etkin.type || "")))) {
      const { selectionStart: b, selectionEnd: s } = etkin;
      if (b != null && s != null && s > b) return { metin: etkin.value.slice(b, s), kutu: etkin.getBoundingClientRect() };
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const metin = sel.toString();
    let kutu = sel.getRangeAt(0).getBoundingClientRect();
    // Bazı düzenleyicilerde aralık kutusu sıfır gelir. O zaman odaktaki öğeye düş.
    if (!kutu.width && !kutu.height && etkin) kutu = etkin.getBoundingClientRect();
    return { metin, kutu };
  }

  function cevir(metin, kutu, elle) {
    metin = metin.trim();
    if (!M.uygunMu(metin)) { if (elle) balonCiz(kutu, "Oto Çevirmen", "Çevrilecek metin bulunamadı.", "hata"); return; }
    if (konak && metin === gosterilen) return;

    const no = ++istekNo;
    gosterilen = metin;
    balonCiz(kutu, "Çevriliyor…", "", "yukleniyor");

    chrome.runtime.sendMessage({ tur: S.MESAJ.cevir, metin }, (yanit) => {
      if (no !== istekNo) return;
      if (chrome.runtime.lastError || !yanit) {
        // Uzantı güncellenince eski sayfalardaki betik yetim kalır, sayfayı yenilemek gerekir.
        balonCiz(kutu, "Oto Çevirmen", "Uzantıya ulaşılamadı — sayfayı yenile.", "hata");
        return;
      }
      if (!yanit.tamam) { balonCiz(kutu, "Oto Çevirmen", yanit.hata, "hata"); return; }
      // Otomatik modda zaten Türkçe olan metin için sessiz kal, elle istendiyse söyle.
      if (M.gereksizMi(yanit.sonuc, metin)) {
        if (elle) balonCiz(kutu, "Türkçe", "Metin zaten Türkçe görünüyor.", "tamam");
        else kapat();
        return;
      }
      balonCiz(kutu, M.dilAdi(yanit.sonuc.kaynakDil) + " → Türkçe", yanit.sonuc.ceviri, "tamam");
    });
  }

  function secimiCevir() {
    const s = secimiAl();
    if (!s || !s.metin.trim()) return;
    cevir(s.metin, s.kutu, false);
  }

  // Yakalama aşamasında dinlenir: sayfa olayı durdursa da seçim kaçmaz.
  document.addEventListener("mouseup", (e) => {
    if (!otomatik || e.button !== 0) return;
    if (konak && e.composedPath().includes(konak)) return; // balonun içinde seçim/tıklama
    // Tıklama seçimi hemen güncellemiyor, bir tur bekle.
    setTimeout(secimiCevir, 0);
  }, true);

  // Dokunmatik ekranda seçim mouseup üretmez; tutamaçlar durulunca çevrilir.
  let sonIsaretci = "mouse";
  let dokunmaZamani = 0;
  document.addEventListener("pointerdown", (e) => { sonIsaretci = e.pointerType; }, true);
  document.addEventListener("selectionchange", () => {
    if (!otomatik || sonIsaretci !== "touch") return;
    clearTimeout(dokunmaZamani);
    dokunmaZamani = setTimeout(secimiCevir, S.DOKUNMA_GECIKMESI);
  });

  // Sağ tık menüsü / klavye kısayolu: otomatik mod kapalı olsa da çevir.
  chrome.runtime.onMessage.addListener((mesaj, _gonderen, yanitla) => {
    if (!mesaj || mesaj.tur !== S.MESAJ.kisayol) return;
    // Yanıtsız kalırsa SW "content script yok" sanıp popup'a düşer.
    yanitla({ alindi: true });
    // all_frames yüzünden mesaj her çerçeveye gider; yalnızca seçimi olan çerçeve yanıt versin.
    const s = secimiAl();
    const metin = mesaj.metin || (s && s.metin);
    if (!metin || !s) return;
    gosterilen = "";
    cevir(metin, s.kutu, true);
  });

  // Dışarı tıklama / kaydırma / Esc ile kapat.
  document.addEventListener("mousedown", (e) => { if (konak && !e.composedPath().includes(konak)) kapat(); }, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") kapat(); }, true);
  window.addEventListener("scroll", (e) => {
    // Balonun kendi içindeki kaydırma onu kapatmamalı.
    if (konak && e.composedPath && e.composedPath().includes(konak)) return;
    kapat();
  }, true);
  window.addEventListener("resize", kapat);
})();
