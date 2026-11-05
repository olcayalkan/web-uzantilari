// Data katmanı — ağ çağrısı ve önbellek. Yalnızca service worker'da yüklenir:
// content script'ten fetch, sayfanın CSP'si ve CORS'u yüzünden çoğu sitede düşer.
(function (global) {
  "use strict";
  const S = global.Sabitler;
  const M = global.CeviriMotoru;

  // Aynı kelimeyi tekrar tekrar seçmek sık; her seferinde ağa gitmeye gerek yok.
  // Map ekleme sırasını koruduğu için en eskiyi atmak yeterli bir LRU yaklaşımı.
  const onbellek = new Map();

  async function parcaCevir(parca, hedef) {
    const yanit = await fetch(M.istekUrl(parca, hedef));
    if (yanit.status === 429) throw new Error("Çok fazla istek; biraz bekleyip tekrar dene.");
    if (!yanit.ok) throw new Error("Çeviri servisi yanıt vermedi (HTTP " + yanit.status + ").");
    return M.yanitCoz(await yanit.json());
  }

  async function cevir(metin, hedef) {
    hedef = hedef || S.HEDEF_DIL;
    const anahtar = hedef + "\u0000" + metin;
    if (onbellek.has(anahtar)) return onbellek.get(anahtar);

    // Parçalar sırayla gider: paralel atış hız sınırına (429) daha çabuk takılıyor.
    const sonuclar = [];
    for (const p of M.parcala(metin)) sonuclar.push(await parcaCevir(p, hedef));
    const sonuc = { ceviri: sonuclar.map((s) => s.ceviri).join(""), kaynakDil: sonuclar[0].kaynakDil };

    onbellek.set(anahtar, sonuc);
    if (onbellek.size > S.ONBELLEK_BOYU) onbellek.delete(onbellek.keys().next().value);
    return sonuc;
  }

  global.CeviriServisi = { cevir };
})(typeof self !== "undefined" ? self : this);
