// Data / altyapı katmanı — Web Audio grafiği. Domain'in kararlarını ses düğümlerine
// uygular; neyin ne kadar kesileceğine kendisi karar vermez (bkz. domain/kararlar.js).
(function (global) {
  "use strict";
  const K = global.Sabitler;

  const rms = (an, buf) => {
    an.getFloatTimeDomainData(buf);
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  };

  // S: canlı ayar nesnesi, D: Kararlar.olustur(S) çıktısı.
  function olustur(S, D) {
    let ctx, chain = null, clock = null, saatVar = false;

    // ---------------- Ses zinciri ----------------
    function buildChain(videoEl) {
      if (videoEl.__vtBound) return videoEl.__vtChain;

      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaElementSource(videoEl);

      const hp = ctx.createBiquadFilter();               // gövde temizliği + hırıltı altı
      hp.type = "highpass"; hp.frequency.value = S.hpFreq; hp.Q.value = 0.7;

      /* GIRTLAK MODÜLÜ - üç bileşen.
       * İstenen azaltmanın tamamını tek bir sabit filtreyle yapmak sesin içini boşaltır.
       * Bu yüzden: %60'ı sürekli taban, %30'u üst formant (2x frekans), %40'ı ise
       * yalnızca gırtlak bandı baskın olduğunda devreye giren dinamik ek. */
      const throat = ctx.createBiquadFilter();            // taban, geniş
      throat.type = "peaking"; throat.frequency.value = S.throatFreq;
      throat.Q.value = 1.0; throat.gain.value = 0;

      const throat2 = ctx.createBiquadFilter();           // üst formant ("honk")
      throat2.type = "peaking"; throat2.frequency.value = S.throatFreq * 2;
      throat2.Q.value = 1.4; throat2.gain.value = 0;

      const throatDyn = ctx.createBiquadFilter();         // dinamik ek
      throatDyn.type = "peaking"; throatDyn.frequency.value = S.throatFreq;
      throatDyn.Q.value = 1.6; throatDyn.gain.value = 0;

      /* PATLAMA BASTIRICI. Gerçek ölçümde patlama anında 900-1500 Hz +18.5 dB,
       * 1.5-2.5k +14.7 dB fırlıyor; 6-9 kHz ise DÜŞÜYOR. Yani olay sibilans değil,
       * orta bantta yoğunlaşan seviye sıçraması. Sabit kesim sesi sürekli boğardı,
       * bu yüzden yalnız sıçrama anında devreye girer. */
      const burst = ctx.createBiquadFilter();
      burst.type = "peaking"; burst.frequency.value = S.burstFreq;
      burst.Q.value = 0.8; burst.gain.value = 0;      // ölçümde bant geniş çıktı

      // Patlamanın yarısı geniş bantta kısılır: tek başına peaking filtre yetmiyordu
      // (ölçüldü: 4.2 dB -> 6.6 dB).
      const duck = ctx.createGain();

      const harsh = ctx.createBiquadFilter();            // 2-4 kHz sertlik
      harsh.type = "peaking"; harsh.frequency.value = S.harshFreq;
      harsh.Q.value = 1.1; harsh.gain.value = -S.harshCut;

      const deess = ctx.createBiquadFilter();            // dinamik de-esser
      deess.type = "peaking"; deess.frequency.value = S.deessFreq;
      deess.Q.value = 1.6; deess.gain.value = 0;

      const comp = ctx.createDynamicsCompressor();       // seviye sıçramaları
      comp.knee.value = 12; comp.attack.value = 0.003; comp.release.value = 0.18;

      // Dengeleyici: seri peaking filtreler (toplama yok -> faz sorunu yok),
      // her biri paralel bir bandpass+analyser ile ölçülür.
      const even = K.EVEN_BANDS.map((f) => {
        const filt = ctx.createBiquadFilter();
        filt.type = "peaking"; filt.frequency.value = f; filt.Q.value = 1.4; filt.gain.value = 0;
        const bpf = ctx.createBiquadFilter();
        bpf.type = "bandpass"; bpf.frequency.value = f; bpf.Q.value = 1.4;
        const an = ctx.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0;
        bpf.connect(an);
        return { f, filt, bpf, an, buf: new Float32Array(1024), avg: 0 };
      });

      // AGC uzun vadeli seviyeyi tutar; kompresör ani tepeleri.
      const agc = ctx.createGain(); agc.gain.value = 1;

      const out = ctx.createGain(); out.gain.value = S.output;

      const lim = ctx.createDynamicsCompressor();        // clipping emniyeti
      lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20;
      lim.attack.value = 0.001; lim.release.value = 0.06;

      src.connect(hp); hp.connect(throat); throat.connect(throat2); throat2.connect(throatDyn);
      throatDyn.connect(burst); burst.connect(harsh); harsh.connect(deess);
      // deess -> dengeleyici bantları (seri) -> duck
      let tail = deess;
      for (const b of even) { tail.connect(b.filt); tail = b.filt; }
      tail.connect(duck); duck.connect(comp); comp.connect(agc); agc.connect(out); out.connect(lim);
      lim.connect(ctx.destination);

      // Analiz kolu (sese dokunmaz, sadece ölçer)
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = S.deessFreq; bp.Q.value = 1.4;
      const bpLow = ctx.createBiquadFilter();
      bpLow.type = "bandpass"; bpLow.frequency.value = S.throatFreq; bpLow.Q.value = 1.0;
      const anHigh = ctx.createAnalyser(); anHigh.fftSize = 1024;
      const anLow  = ctx.createAnalyser(); anLow.fftSize = 1024;
      const anFull = ctx.createAnalyser(); anFull.fftSize = 1024;
      for (const b of even) hp.connect(b.bpf);
      hp.connect(bp); bp.connect(anHigh);
      hp.connect(bpLow); bpLow.connect(anLow);
      hp.connect(anFull);

      const c = { el: videoEl, src, hp, throat, throat2, throatDyn, burst, duck, harsh, deess, even,
                  comp, agc, out, lim, bp, bpLow, anHigh, anLow, anFull,
                  bufH: new Float32Array(1024), bufL: new Float32Array(1024),
                  bufF: new Float32Array(1024) };
      videoEl.__vtBound = true;
      videoEl.__vtChain = c;
      return c;
    }

    let env = 0;                                          // yavaş RMS zarfı (~1 sn)
    function loop() {
      if (!chain) return;
      if (!S.on) {
        if (chain.deess.gain.value !== 0) chain.deess.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
        if (chain.agc.gain.value !== 1) chain.agc.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
        if (chain.throatDyn.gain.value !== 0) chain.throatDyn.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        if (chain.burst.gain.value !== 0) chain.burst.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
        if (chain.duck.gain.value !== 1) chain.duck.gain.setTargetAtTime(1, ctx.currentTime, 0.05);
        for (const b of chain.even)
          if (b.filt.gain.value !== 0) b.filt.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
        return;
      }
      const f = rms(chain.anFull, chain.bufF);
      const cut = D.cutFor(rms(chain.anHigh, chain.bufH), f);
      const tau = cut < chain.deess.gain.value ? 0.004 : 0.05;  // hızlı attack, yavaş release
      chain.deess.gain.setTargetAtTime(cut, ctx.currentTime, tau);

      // Gırtlak dinamik eki - tını olduğu için de-esser'dan yavaş davranır
      const tCut = D.throatCutFor(rms(chain.anLow, chain.bufL), f);
      const tTau = tCut < chain.throatDyn.gain.value ? 0.02 : 0.15;
      chain.throatDyn.gain.setTargetAtTime(tCut, ctx.currentTime, tTau);

      // Patlama: zarfa GÖRE ani sıçrama -> çok hızlı in, yavaş çık
      const bCut = D.burstCutFor(f, env);
      const bTau = bCut < chain.burst.gain.value ? 0.003 : 0.12;
      chain.burst.gain.setTargetAtTime(bCut * (1 - K.BURST_SPLIT), ctx.currentTime, bTau);
      const dGain = Math.pow(10, (bCut * K.BURST_SPLIT) / 20);
      chain.duck.gain.setTargetAtTime(dGain, ctx.currentTime,
        dGain < chain.duck.gain.value ? 0.003 : 0.12);

      // Frekans dengeleme: her bant kendi ortalamasına çekilir
      for (const b of chain.even) {
        const cur = rms(b.an, b.buf);
        b.avg = b.avg ? b.avg * (1 - K.EVEN_AVG_K) + cur * K.EVEN_AVG_K : cur;
        const g = D.evenCutFor(cur, b.avg);
        b.filt.gain.setTargetAtTime(g, ctx.currentTime,
          g < b.filt.gain.value ? 0.008 : 0.25);       // hızlı in, çok yavaş çık = yumuşak
      }

      env = env * 0.985 + f * 0.015;                      // yavaş zarf
      chain.agc.gain.setTargetAtTime(D.agcFor(env), ctx.currentTime, 0.35);
    }

    function applySettings() {
      if (!chain) return;
      chain.hp.frequency.value = S.on ? S.hpFreq : 20;
      const tdb = D.throatDb();
      chain.throat.frequency.value = S.throatFreq;
      chain.throat.gain.value = S.on ? 0.6 * tdb : 0;      // sürekli taban
      chain.throat2.frequency.value = S.throatFreq * 2;
      chain.throat2.gain.value = S.on ? 0.3 * tdb : 0;     // üst formant
      chain.throatDyn.frequency.value = S.throatFreq;
      chain.bpLow.frequency.value = S.throatFreq;
      chain.burst.frequency.value = S.burstFreq;
      chain.harsh.frequency.value = S.harshFreq;
      chain.harsh.gain.value = S.on ? -S.harshCut : 0;
      chain.deess.frequency.value = S.deessFreq;
      chain.bp.frequency.value = S.deessFreq;
      chain.out.gain.value = S.on ? S.output : 1;
      chain.comp.threshold.value = S.on ? (-6 - 34 * S.comp) : 0;
      chain.comp.ratio.value = S.on ? (1.5 + 18.5 * S.comp) : 1;
      chain.lim.threshold.value = S.on ? -2 : 0;
    }

    /* Analiz saati.
     * setInterval arka plan sekmesinde 1 Hz'e kısılır (music.youtube.com'da sorun olurdu).
     * Worker çözüm DEĞİL: content script'ten new Worker() sayfanın CSP'sine tabi tutuluyor,
     * YouTube hem chrome-extension: hem blob: worker'ı bloklar.
     * Doğru araç ses thread'i: ScriptProcessor'ın onaudioprocess olayı bir zamanlayıcı
     * değildir, ses saatiyle sürülür ve sekme arka plandayken de akmaya devam eder.
     * Sıfır kazançlı bir yan kolda durur, sinyal yoluna dokunmaz. */
    function startClock(fn) {
      try {
        const sp = ctx.createScriptProcessor(1024, 1, 1);   // ~21 ms
        sp.onaudioprocess = fn;
        const sink = ctx.createGain(); sink.gain.value = 0;
        chain.hp.connect(sp); sp.connect(sink); sink.connect(ctx.destination);
        return sp;
      } catch (_) {}
      setInterval(fn, 16);          // son çare: arka planda kısıtlanır ama çalışır
      return null;
    }

    // Sayfadaki videoya bağlanır; video henüz yoksa false döner, çağıran yeniden dener.
    function attach(videoEl) {
      if (!videoEl) return false;
      try { chain = buildChain(videoEl); } catch (e) { console.warn("[VoiceTamer]", e.message); return false; }
      if (ctx.state === "suspended") ctx.resume();
      applySettings();
      if (!saatVar) { saatVar = true; clock = startClock(loop); }
      return true;
    }

    // AudioContext tarayıcı kuralı gereği ilk kullanıcı etkileşiminde açılır.
    function uyandir() { if (ctx && ctx.state === "suspended") ctx.resume(); }

    return {
      attach, loop, applySettings, uyandir,
      get chain() { return chain; },
      get clock() { return clock; },
    };
  }

  global.SesMotoru = { olustur };
})(typeof self !== "undefined" ? self : this);
