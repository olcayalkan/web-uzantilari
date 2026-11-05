// Data katmanı: chrome.storage üzerinde ince sarmalayıcı.
// Ayar sync'te durur ki kullanıcının diğer Chrome'larına da geçsin. Son seçim
// yalnızca popup'a aktarılmak için tutulur, cihaza özgü olduğundan local'de durur.
(function (global) {
  "use strict";
  const K = (global.Sabitler && global.Sabitler.DEPO_ANAHTAR) || { otomatik: "otomatik", secim: "sonSecim" };

  function alan(tur) {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage[tur];
  }

  const Depolama = {
    // Varsayılan açık: uzantının asıl amacı seçince kendiliğinden çevirmek.
    otomatikYukle(cb) { const s = alan("sync"); if (!s) return cb(true); s.get({ [K.otomatik]: true }, (d) => cb(!!(d && d[K.otomatik]))); },
    otomatikKaydet(acik) { const s = alan("sync"); if (s) s.set({ [K.otomatik]: !!acik }); },
    otomatikIzle(cb) {
      if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.onChanged) return;
      chrome.storage.onChanged.addListener((d, tur) => { if (tur === "sync" && d[K.otomatik]) cb(!!d[K.otomatik].newValue); });
    },
    secimYukle(cb) { const l = alan("local"); if (!l) return cb(null); l.get(K.secim, (d) => cb(d && d[K.secim])); },
    secimKaydet(m) { const l = alan("local"); if (l) l.set({ [K.secim]: m }); },
    secimTemizle() { const l = alan("local"); if (l) l.remove(K.secim); }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Depolama;
  global.Depolama = Depolama;
})(typeof self !== "undefined" ? self : this);
