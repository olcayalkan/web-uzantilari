// Data katmanı: chrome.storage.local üzerinde ince sarmalayıcı. Bileşenler birbirine
// mesaj göndermez, tek ortak nokta bu kayıttır. Panel yazar, diğerleri izler.
(function (global) {
  'use strict';
  const K = global.Sabitler.DEPO_ANAHTAR;
  const ANAHTARLAR = [K.acik, K.oran];

  const Depolama = {
    yukle: () => chrome.storage.local.get(ANAHTARLAR),
    kaydet: (ayar) => chrome.storage.local.set(ayar),
    // Yalnızca değişen alanları bildirir: { acik?, oran? }
    izle(cb) {
      chrome.storage.onChanged.addListener((d, alan) => {
        if (alan !== 'local') return;
        const ayar = {};
        for (const k of ANAHTARLAR) if (k in d) ayar[k] = d[k].newValue;
        if (Object.keys(ayar).length) cb(ayar);
      });
    },
  };

  global.Depolama = Depolama;
})(typeof self !== 'undefined' ? self : this);
