// Data katmanı — chrome.storage.local üzerinde ince bir veri kaynağı sarmalayıcı.
// Sunum (popup) ve service worker doğrudan chrome.storage'a dokunmaz; buradan geçer.
// chrome API yoksa (test/izole) sessizce boş döner, davranış değişmez.
(function (global) {
  "use strict";
  const K = (global.Sabitler && global.Sabitler.DEPO_ANAHTAR) ||
    { mod: "sonMod", yontem: "sonYontem", secim: "sonSecim", acik: "otoCozAcik" };

  function yerel() {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  }

  const Depolama = {
    tercihleriYukle(cb) { const l = yerel(); if (!l) return cb({}); l.get([K.mod, K.yontem], (d) => cb(d || {})); },
    tercihKaydet(mod, yontem) { const l = yerel(); if (!l) return; try { l.set({ [K.mod]: mod, [K.yontem]: yontem }); } catch (_) {} },
    secimYukle(cb) { const l = yerel(); if (!l) return cb(null); l.get(K.secim, (d) => cb(d && d[K.secim])); },
    secimKaydet(s) { const l = yerel(); if (!l) return; try { l.set({ [K.secim]: s }); } catch (_) {} },
    secimTemizle() { const l = yerel(); if (!l) return; l.remove(K.secim); },
    // Anahtar hiç kaydedilmemişse açık sayılır: özellik eskiden hep açıktı, güncelleme kapatmasın.
    acikYukle(cb) { const l = yerel(); if (!l) return cb(true); l.get(K.acik, (d) => cb(!d || d[K.acik] !== false)); },
    acikKaydet(v) { const l = yerel(); if (!l) return; try { l.set({ [K.acik]: !!v }); } catch (_) {} },
    acikDinle(cb) {
      if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.onChanged) return;
      chrome.storage.onChanged.addListener((d, alan) => {
        if (alan === "local" && K.acik in d) cb(d[K.acik].newValue !== false);
      });
    }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Depolama;
  global.Depolama = Depolama;
})(typeof self !== "undefined" ? self : this);
