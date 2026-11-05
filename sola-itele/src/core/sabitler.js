// Core katmanı: paylaşılan sabitler. Panel, içerik betiği ve arka plan aynı depo
// anahtarlarını ve varsayılanları buradan alır.
(function (global) {
  'use strict';
  const Sabitler = {
    DEPO_ANAHTAR: { acik: 'acik', oran: 'oran' },
    VARSAYILAN_ORAN: 0.7,
    STIL_ID: 'sola-itele-stil',
    // DOM değişikliği sonrası yeniden tarama gecikmesi; menü animasyonlarını birleştirir.
    TARAMA_GECIKMESI: 250,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Sabitler;
  global.Sabitler = Sabitler;
})(typeof self !== 'undefined' ? self : this);
