// Sayfa-içi seçim çözücü: kullanıcı metin seçince en olası çözümü küçük bir
// balonda gösterir. Popup/sağ-tık gerekmez. İzole dünyada çalışır, sayfaya
// yalnızca tek bir balon elementi ekler ve global değişken bırakmaz.

(function () {
  "use strict";
  if (window.__cozucuYuklu) return; // iki kez enjekte olursa tekrar kurma
  window.__cozucuYuklu = true;

  let balon = null;
  // Popup'taki anahtar kapanınca sayfa yenilenmeden susması için değişiklik de dinlenir.
  let acik = true;
  if (window.Depolama) {
    Depolama.acikYukle((v) => { acik = v; });
    Depolama.acikDinle((v) => { acik = v; if (!v) balonuKapat(); });
  }

  function balonuKapat() {
    if (balon) { balon.remove(); balon = null; }
  }

  function balonOlustur(yontem, cikti, x, y) {
    balonuKapat();
    balon = document.createElement("div");
    balon.setAttribute("data-cozucu", "1");
    // Inline stil: sayfa CSS'inden etkilenmemek için hepsi !important.
    const s = balon.style;
    // innerWidth klasik kaydırma çubuğunu da (Windows, Linux) sayar; balon çubuğun altına girmesin.
    const kok = (document.compatMode === "BackCompat" && document.body) || document.documentElement;
    const k = {
      position: "fixed", left: Math.max(8, Math.min(x, (kok.clientWidth || window.innerWidth) - 300)) + "px", top: (y + 12) + "px",
      "z-index": "2147483647", "max-width": "280px", background: "#282a36", color: "#e4e4ef",
      border: "1px solid #8be9fd", "border-radius": "8px", padding: "8px 10px",
      font: "12px/1.45 -apple-system,Segoe UI,system-ui,sans-serif", "box-shadow": "0 4px 16px rgba(0,0,0,.4)",
      "white-space": "pre-wrap", "word-break": "break-word"
    };
    for (const p in k) s.setProperty(p, k[p], "important");

    const baslik = document.createElement("div");
    baslik.textContent = "🔓 " + yontem;
    baslik.style.setProperty("color", "#50fa7b", "important");
    baslik.style.setProperty("font-weight", "600", "important");
    baslik.style.setProperty("margin-bottom", "4px", "important");

    const metin = document.createElement("div");
    metin.textContent = cikti.length > 400 ? cikti.slice(0, 400) + "…" : cikti;
    metin.style.setProperty("font-family", "ui-monospace,Menlo,monospace", "important");

    const kopyala = document.createElement("button");
    kopyala.textContent = "Kopyala";
    const bs = kopyala.style;
    const bk = { "margin-top": "6px", cursor: "pointer", font: "11px sans-serif", background: "#3a3d4d", color: "#e4e4ef", border: "1px solid #555", "border-radius": "5px", padding: "2px 8px" };
    for (const p in bk) bs.setProperty(p, bk[p], "important");
    kopyala.addEventListener("mousedown", (e) => e.preventDefault());
    kopyala.addEventListener("click", () => {
      navigator.clipboard.writeText(cikti).then(() => { kopyala.textContent = "✓"; });
    });

    balon.append(baslik, metin, kopyala);
    document.body.appendChild(balon);
  }

  function secimiCoz() {
    const sel = window.getSelection();
    const metin = sel ? sel.toString().trim() : "";
    if (metin.length < 3 || metin.length > 4096) { balonuKapat(); return; }
    if (!window.Cozucu) { balonuKapat(); return; }

    const liste = window.Cozucu.coz(metin);
    // Yalnızca güvenilir çözüm göster: yapısal yöntem ya da yüksek okunabilirlik.
    const iyi = liste.find((r) => r.puan >= 0.55 || /Base|Hex|URL|JWT|Morse|Unicode|Binary/.test(r.yontem));
    if (!iyi) { balonuKapat(); return; }

    const rect = sel.getRangeAt(0).getBoundingClientRect();
    balonOlustur(iyi.yontem, iyi.cikti, rect.left, rect.bottom);
  }

  // Yakalama aşamasında dinlenir: sayfa olayı durdursa da seçim kaçmaz.
  document.addEventListener("mouseup", (e) => {
    // Balonun kendi içine tıklamada kapatma.
    if (balon && balon.contains(e.target)) return;
    if (!acik) return;
    setTimeout(secimiCoz, 0);
  }, true);

  // Dokunmatik ekranda seçim mouseup üretmez; tutamaçlar durulunca çözülür.
  let sonIsaretci = "mouse";
  let dokunmaZamani = 0;
  document.addEventListener("pointerdown", (e) => { sonIsaretci = e.pointerType; }, true);
  document.addEventListener("selectionchange", () => {
    if (!acik || sonIsaretci !== "touch") return;
    clearTimeout(dokunmaZamani);
    dokunmaZamani = setTimeout(secimiCoz, 500);
  });

  // Dışarı tıklama / kaydırma / Esc ile kapat.
  document.addEventListener("mousedown", (e) => { if (balon && !balon.contains(e.target)) balonuKapat(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") balonuKapat(); });
  window.addEventListener("scroll", balonuKapat, true);
})();
