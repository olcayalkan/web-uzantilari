// Domain katmanı: sesin ne kadar kesileceğine karar veren saf fonksiyonlar.
// Web Audio bilmez: ölçülen RMS değerlerini alır, dB ya da kazanç döndürür.
// Ayar nesnesi dışarıdan verilir; panel onu değiştirince kararlar anında izler.
(function (global) {
  "use strict";
  const K = global.Sabitler || (typeof require !== "undefined" ? require("../../../core/sabitler.js") : {});
  const A = global.Ayarlar || (typeof require !== "undefined" ? require("./ayarlar.js") : {});
  const clamp = A.clamp;

  function olustur(S) {
    // De-esser: yüksek band ve tam band RMS'inden kesim miktarı (dB).
    function cutFor(highRms, fullRms) {
      const ratio = highRms / (fullRms + 1e-6);              // sibilans yoğunluğu
      const amt = clamp((ratio - S.deessSens) / 0.22, 0, 1);
      return -S.deessMax * amt;
    }

    // Gırtlak: yüzde -> dB. %80 azaltma = genlikte 0.2x = -13.98 dB.
    const throatDb = () => (S.throatAmt >= 0.999 ? -40 : 20 * Math.log10(1 - S.throatAmt));

    function throatCutFor(lowRms, fullRms) {
      if (S.throatAmt <= 0) return 0;
      const ratio = lowRms / (fullRms + 1e-6);
      const amt = clamp((ratio - K.THROAT_SENS) / K.THROAT_RAMP, 0, 1);
      return 0.4 * throatDb() * amt;          // istenen azaltmanın dinamik %40'ı
    }

    // Patlama: anlık RMS'in yavaş zarfa oranı.
    function burstCutFor(now, envSlow) {
      if (S.burstMax <= 0 || envSlow < 0.002) return 0;
      const r = now / (envSlow + 1e-6);
      return -S.burstMax * clamp((r - S.burstSens) / K.BURST_RAMP, 0, 1);
    }

    /* Frekans dengeleyici: anlık seviye bant ortalamasının üstüne çıkınca o bant
     * o kadar kısılır. Yalnızca aşağı yönlü çalışır: çukurları doldurmak fon gürültüsünü
     * ve tizliği öne çıkarıyordu (ölçümde çift yönlü daha kötü çıktı). */
    function evenCutFor(cur, avg) {
      if (S.evenAmt <= 0 || avg < 1e-5 || cur < 1e-6) return 0;
      const devDb = 20 * Math.log10(cur / avg);        // ortalamadan sapma
      return -clamp(devDb, 0, S.evenDepth) * S.evenAmt;
    }

    /* AGC yalnızca aşağı yönlü, tavanı 1.0. Ölçümde yükseltme ters tepti (sakin bölümler
     * yükselince yorgunluk artıyor). Sessizlikte 1.0 döner ki fon gürültüsü büyümesin. */
    function agcFor(env) {
      if (S.level <= 0 || env < 0.002) return 1;
      const g = clamp(K.AGC_TARGET / env, 1 / 3, 1);     // en fazla 3x kıs, yükseltme yok
      return 1 + (g - 1) * S.level;
    }

    return { cutFor, throatDb, throatCutFor, burstCutFor, evenCutFor, agcFor };
  }

  const Kararlar = { olustur };
  if (typeof module !== "undefined" && module.exports) module.exports = Kararlar;
  global.Kararlar = Kararlar;
})(typeof self !== "undefined" ? self : this);
