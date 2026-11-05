// Data katmanı: localStorage üzerinde ince sarmalayıcı.
// localStorage kullanılır ki manifest'te hiç izin istenmesin ("storage" dahil).
// Okunan veri güvenilmez sayılır; doğrulamayı domain yapar.
(function (global) {
  "use strict";
  const S = global.Sabitler;
  const A = global.Ayarlar;

  const Depolama = {
    ayarlariOku() {
      let ham = null;
      try { ham = JSON.parse(localStorage.getItem(S.LS_KEY) || "{}"); } catch (_) {}
      return A.dogrula(ham);
    },
    ayarlariYaz(ayar) {
      try { localStorage.setItem(S.LS_KEY, JSON.stringify(A.disaAktar(ayar))); } catch (_) {}
    },
    gizliMi() {
      try { return localStorage.getItem(S.HK) === "1"; } catch (_) { return false; }
    },
    gizliYaz(gizli) {
      try { localStorage.setItem(S.HK, gizli ? "1" : "0"); } catch (_) {}
    },
  };

  global.Depolama = Depolama;
})(typeof self !== "undefined" ? self : this);
