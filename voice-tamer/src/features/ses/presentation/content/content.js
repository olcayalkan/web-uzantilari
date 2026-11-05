/* Voice Tamer - YouTube ses yumuşatıcı, giriş noktası.
 * Katmanları birbirine bağlar: depodan ayar -> domain kararları -> ses motoru -> panel.
 * Tamamen yerel: ağ çağrısı, harici bağımlılık, eval/innerHTML, sayfa scriptleriyle
 * veri alışverişi yok.
 */
(() => {
  'use strict';

  // --- Savunma katmanı 1: sadece YouTube. Manifest zaten kısıtlıyor, bu ikinci kilit.
  if (!/(^|\.)youtube\.com$/i.test(location.hostname)) return;

  // Zaten kuruluysa sadece paneli aç/kapat
  if (window.__voiceTamer) { window.__voiceTamer.toggleUI(); return; }

  // --- Savunma katmanı 2: ayar şeması (domain/ayarlar.js) bozuk ya da kötücül değeri kırpar.
  const S = Depolama.ayarlariOku();
  const D = Kararlar.olustur(S);
  const motor = SesMotoru.olustur(S, D);

  const uygula = () => { Depolama.ayarlariYaz(S); motor.applySettings(); };

  const panel = Panel.kur(S, {
    uygula,
    zincir: () => motor.chain,
    gizliMi: Depolama.gizliMi,
    gizliYaz: Depolama.gizliYaz,
  });

  const bagla = () => motor.attach(document.querySelector('video'));

  // Video gelene kadar dene (SPA / geç yüklenen player), 60 sn sonra vazgeç
  if (!bagla()) {
    const iv = setInterval(() => { if (bagla()) clearInterval(iv); }, 700);
    setTimeout(() => clearInterval(iv), 60000);
  }
  // AudioContext ilk kullanıcı etkileşiminde açılır - tek seferlik dinleyici
  addEventListener('click', motor.uyandir, { once: true, capture: true });

  window.__voiceTamer = {
    toggleUI: panel.toggleUI,
    settings: S,
    _tick: motor.loop,            // test/hata ayıklama: analiz döngüsünü elle çalıştır
    _cutFor: D.cutFor,            // test: de-esser karar fonksiyonu
    _agcFor: D.agcFor,            // test: seviye sabitleme karar fonksiyonu
    _throatCutFor: D.throatCutFor,  // test: gırtlak karar fonksiyonu
    _throatDb: D.throatDb,
    _burstCutFor: D.burstCutFor,  // test: patlama karar fonksiyonu
    _evenCutFor: D.evenCutFor,    // test: frekans dengeleme karar fonksiyonu
    _evenBands: Sabitler.EVEN_BANDS,
    get _clock() { return motor.clock; },
    get chain() { return motor.chain; },
  };
  console.log('%c[Voice Tamer] aktif', 'color:#22c55e');
})();
