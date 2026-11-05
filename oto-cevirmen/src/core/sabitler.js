// Core — uygulama genelinde paylaşılan sabitler.
// Content script, popup ve service worker aynı anahtarları kullanmalı; tek yerden gelir.
(function (global) {
  "use strict";
  const Sabitler = {
    DEPO_ANAHTAR: { otomatik: "otomatik", secim: "sonSecim" },
    HEDEF_DIL: "tr",
    MIN_HARF: 2,
    MAKS_GIRDI: 5000,
    // Google uç noktası uzun GET sorgularını reddediyor; Türkçe karakterler
    // URL'de 6 bayta şiştiği için parça boyu temkinli tutuldu.
    PARCA_BOYU: 1500,
    ONBELLEK_BOYU: 200,
    MESAJ: { cevir: "cevir", kisayol: "kisayolCevir" }
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Sabitler;
  global.Sabitler = Sabitler;
})(typeof self !== "undefined" ? self : this);
