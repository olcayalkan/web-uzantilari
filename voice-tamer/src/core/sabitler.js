// Core katmanı. Voice Tamer genelinde paylaşılan sabitler: ayar şeması, kalibrasyon
// eşikleri, hazır ayarlar. Domain, data ve panel aynı sınırları buradan alır.
(function (global) {
  "use strict";

  /* Ayar şeması. Her alanın tipi ve SINIRI burada. localStorage'ı aynı origin'deki
   * başka bir script bozabilir. Sınırı olmayan bir "output" sesi kulağa zarar verecek
   * kadar açabilirdi. Anahtar sırası paneldeki etiket numaralarıyla (v1..v16) eşleşir, değiştirme. */
  const SPEC = {
    deessMax:   { min: 0,    max: 24,   def: 10   },  // dB, maks sibilans kesme
    deessFreq:  { min: 4500, max: 9500, def: 7000 },  // Hz
    deessSens:  { min: 0.05, max: 0.40, def: 0.18 },  // düşük = agresif
    throatAmt:  { min: 0,    max: 0.98, def: 0.80 },  // gırtlak azaltma oranı (genlik)
    throatFreq: { min: 200,  max: 900,  def: 450  },  // Hz
    harshCut:   { min: 0,    max: 20,   def: 4    },  // dB
    harshFreq:  { min: 800,  max: 5000, def: 3200 },  // Hz
    hpFreq:     { min: 60,   max: 250,  def: 100  },  // Hz, gırtlak hırıltısının altı
    level:      { min: 0,    max: 1,    def: 0.6  },  // seviye sabitleme (AGC)
    comp:       { min: 0,    max: 1,    def: 0.5  },
    output:     { min: 0.2,  max: 3,    def: 1    },  // üst sınır işitme güvenliği için
    burstMax:   { min: 0,    max: 36,   def: 12   },  // dB, ses patlaması bastırma
    burstFreq:  { min: 500,  max: 3000, def: 1200 },  // Hz, patlamanın oturduğu bant
    burstSens:  { min: 1.10, max: 3.00, def: 1.50 },  // düşük = daha sık tetiklenir
    evenAmt:    { min: 0,    max: 1,    def: 0.6  },  // frekans dengeleme gücü
    evenDepth:  { min: 0,    max: 20,   def: 12   },  // dB, bant başına maks düzeltme
  };

  const Sabitler = {
    LS_KEY: "voiceTamer.settings.v1",
    HK: "voiceTamer.hidden",
    SPEC,
    KEYS: Object.keys(SPEC),

    /* Ölçülen eşikler (kalibrasyon): normal seste düşük-orta/tam band oranı ~0.65,
     * gırtlaklı seste ~0.87. Eşik ikisinin arasında, rampa 0.14. */
    THROAT_SENS: 0.72, THROAT_RAMP: 0.14,

    /* Patlama: ölçülen tepe/medyan = 3.0 (+9.6 dB). Kesimin yarısı filtrede,
     * yarısı geniş bantta (tek başına filtre yetmiyordu). */
    BURST_RAMP: 0.8, BURST_SPLIT: 0.5,

    // Frekans dengeleyici bantları ve ~3.5 sn'lik ortalama katsayısı (21 ms tik).
    EVEN_BANDS: [200, 320, 500, 780, 1200, 1850, 2800, 4200, 6400],
    EVEN_AVG_K: 0.006,

    AGC_TARGET: 0.05,

    PRESETS: {
      soft: { deessMax: 6,  deessSens: 0.22, harshCut: 2.5, throatAmt: 0.55,
              hpFreq: 85,  level: 0.4,  comp: 0.5,  burstMax: 8,  burstFreq: 1200, burstSens: 2.00, evenAmt: 0.4, evenDepth: 8 },
      mid:  { deessMax: 10, deessSens: 0.18, harshCut: 4,   throatAmt: 0.80,
              hpFreq: 100, level: 0.6,  comp: 0.75, burstMax: 14, burstFreq: 1200, burstSens: 1.50, evenAmt: 0.6, evenDepth: 12 },
      hard: { deessMax: 16, deessSens: 0.13, harshCut: 8,   throatAmt: 0.92,
              hpFreq: 120, level: 0.85, comp: 0.9,  burstMax: 22, burstFreq: 1200, burstSens: 1.30, evenAmt: 0.8, evenDepth: 16 },
      max:  { deessMax: 20, deessSens: 0.10, harshCut: 13,  throatAmt: 0.96,
              hpFreq: 140, level: 1.0,  comp: 1.0,  burstMax: 32, burstFreq: 1200, burstSens: 1.15, evenAmt: 1.0, evenDepth: 20 },
    },
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Sabitler;
  global.Sabitler = Sabitler;
})(typeof self !== "undefined" ? self : this);
