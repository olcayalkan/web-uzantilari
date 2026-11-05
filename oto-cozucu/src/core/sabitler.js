// Core katmanı: uygulama genelinde paylaşılan sabitler.
// Popup ve service worker depolama anahtarlarını buradan alır.
(function (global) {
  "use strict";
  const Sabitler = {
    DEPO_ANAHTAR: { mod: "sonMod", yontem: "sonYontem", secim: "sonSecim", acik: "otoCozAcik" },
    MAKS_GIRDI: 4096,
    SONUC_KATLAMA: 3 // Çöz modunda doğrudan gösterilecek aday sayısı
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Sabitler;
  global.Sabitler = Sabitler;
})(typeof self !== "undefined" ? self : this);
