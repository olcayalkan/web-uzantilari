// Domain — ayar doğrulama. Saf: depolama ya da DOM bilmez, Node ile test edilir.
(function (global) {
  "use strict";
  const S = global.Sabitler || (typeof require !== "undefined" ? require("../../../core/sabitler.js") : {});

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* Dışarıdan gelen ham nesneyi şemaya göre ayara çevirir. Yalnızca bilinen anahtarlar
   * okunur, böylece prototype pollution (__proto__) kapalı kalır. Her değer sınırına
   * kırpılır, sayı olmayan değer varsayılanda kalır. */
  function dogrula(ham) {
    const s = { on: true };
    for (const k of S.KEYS) s[k] = S.SPEC[k].def;
    if (!ham || typeof ham !== "object" || Array.isArray(ham)) return s;
    for (const k of S.KEYS) {
      if (!Object.prototype.hasOwnProperty.call(ham, k)) continue;
      const v = Number(ham[k]);
      if (Number.isFinite(v)) s[k] = clamp(v, S.SPEC[k].min, S.SPEC[k].max);
    }
    if (typeof ham.on === "boolean") s.on = ham.on;
    return s;
  }

  // Kaydedilecek biçim: yalnızca şemadaki alanlar, çalışma anı eklentileri sızmasın.
  function disaAktar(s) {
    const o = { on: s.on };
    for (const k of S.KEYS) o[k] = s[k];
    return o;
  }

  const Ayarlar = { clamp, dogrula, disaAktar };
  if (typeof module !== "undefined" && module.exports) module.exports = Ayarlar;
  global.Ayarlar = Ayarlar;
})(typeof self !== "undefined" ? self : this);
