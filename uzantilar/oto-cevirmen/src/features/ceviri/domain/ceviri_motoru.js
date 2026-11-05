// Domain — saf çeviri mantığı: girdi süzme, parçalama, istek adresi, yanıt çözme.
// chrome API'si ve ağ yok; bu yüzden Node ile doğrudan test edilebilir.
(function (global) {
  "use strict";
  const S = global.Sabitler || (typeof require !== "undefined" ? require("../../../core/sabitler.js") : {});

  const UC = "https://translate.googleapis.com/translate_a/single";

  // Yalnızca sayı/sembol ya da tek bir URL seçildiyse çeviri anlamsız; balon
  // açılırsa kullanıcı her kopyalama seçiminde rahatsız olur.
  function uygunMu(metin) {
    if (typeof metin !== "string") return false;
    const t = metin.trim();
    if (t.length > S.MAKS_GIRDI) return false;
    const harfler = t.match(/\p{L}/gu);
    if (!harfler || harfler.length < S.MIN_HARF) return false;
    if (/^(https?:\/\/|www\.)\S+$/i.test(t)) return false;
    if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(t)) return false;
    return true;
  }

  // Cümle sonundan bölmek çevirinin bağlamını korur; cümle yoksa boşluktan,
  // o da yoksa sert keser (tek dev kelime nadir, ama sonsuz döngü olmamalı).
  function parcala(metin, boy) {
    boy = boy || S.PARCA_BOYU;
    const parcalar = [];
    let kalan = metin;
    while (kalan.length > boy) {
      const pencere = kalan.slice(0, boy);
      // `son`: ayırıcı dahil kesim ucu; ayırıcı sonraki parçanın başına kalmasın.
      const uc = (ayirici) => { const i = pencere.lastIndexOf(ayirici); return i < 0 ? -1 : i + ayirici.length; };
      let son = Math.max(uc(". "), uc("? "), uc("! "), uc("\n"));
      if (son < boy / 3) son = uc(" ");
      if (son <= 0) son = boy;
      parcalar.push(kalan.slice(0, son));
      kalan = kalan.slice(son);
    }
    if (kalan) parcalar.push(kalan);
    return parcalar;
  }

  function istekUrl(metin, hedef) {
    const p = new URLSearchParams({ client: "gtx", sl: "auto", tl: hedef || S.HEDEF_DIL, dt: "t", q: metin });
    return UC + "?" + p.toString();
  }

  // Yanıt biçimi: [[[çeviri, kaynak, ...], ...], null, "kaynakDil", ...].
  // Segment listesinin sonunda çevirisi null olan harf çevirisi kayıtları olabilir.
  function yanitCoz(veri) {
    if (!Array.isArray(veri) || !Array.isArray(veri[0])) throw new Error("Beklenmeyen yanıt biçimi");
    const ceviri = veri[0].map((s) => (Array.isArray(s) && typeof s[0] === "string" ? s[0] : "")).join("");
    return { ceviri, kaynakDil: typeof veri[2] === "string" ? veri[2] : "" };
  }

  // Zaten Türkçe olan metin için balon göstermek gürültüdür.
  function gereksizMi(sonuc, metin) {
    if (!sonuc) return true;
    if (sonuc.kaynakDil === S.HEDEF_DIL) return true;
    return sonuc.ceviri.trim().toLocaleLowerCase("tr") === metin.trim().toLocaleLowerCase("tr");
  }

  let adlandirici = null;
  function dilAdi(kod) {
    if (!kod) return "Bilinmeyen dil";
    try {
      adlandirici = adlandirici || new Intl.DisplayNames(["tr"], { type: "language" });
      const ad = adlandirici.of(kod);
      return ad ? ad.charAt(0).toLocaleUpperCase("tr") + ad.slice(1) : kod;
    } catch (_) {
      return kod;
    }
  }

  const CeviriMotoru = { uygunMu, parcala, istekUrl, yanitCoz, gereksizMi, dilAdi };
  if (typeof module !== "undefined" && module.exports) module.exports = CeviriMotoru;
  global.CeviriMotoru = CeviriMotoru;
})(typeof self !== "undefined" ? self : this);
