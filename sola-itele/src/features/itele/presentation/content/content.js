// Presentation katmanı. Hesabı domain yapar (itele_motoru.js), bu dosya sayfayı
// ölçer, satır içi stil yazar ve değişiklikleri geri alır.
(() => {
  const S = Sabitler;
  const M = IteleMotoru;

  // Değiştirilen fixed öğe -> { özellik: [eski değer, eski öncelik] }
  const ayarlananlar = new Map();
  let acik = false;
  let oran = S.VARSAYILAN_ORAN;
  let zamanlayici = 0;
  const gozlemci = new MutationObserver(() => planla());

  const ayarla = (el, degerler) => {
    const eski = ayarlananlar.get(el) || {};
    for (const [ozellik, deger] of Object.entries(degerler)) {
      if (!(ozellik in eski)) eski[ozellik] = [el.style.getPropertyValue(ozellik), el.style.getPropertyPriority(ozellik)];
      el.style.setProperty(ozellik, deger, 'important');
    }
    ayarlananlar.set(el, eski);
  };

  const geriAl = (el) => {
    for (const [ozellik, [deger, oncelik]] of Object.entries(ayarlananlar.get(el))) {
      if (deger) el.style.setProperty(ozellik, deger, oncelik);
      else el.style.removeProperty(ozellik);
    }
    ayarlananlar.delete(el);
  };

  const fixedleriSigdir = () => {
    const genislik = window.innerWidth;
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed') continue;
      const degerler = M.fixedYerlesim(el.getBoundingClientRect(), genislik, oran, parseFloat(cs.left));
      if (degerler) ayarla(el, degerler);
    }
  };

  // Önce her şey geri alınır, sonra yeniden ölçülür: öğenin özgün konumu her
  // seferinde doğru hesaplansın. Kendi stil yazımımız gözlemciyi tetiklemesin diye
  // tarama sırasında gözlemci kapalı.
  const tara = () => {
    gozlemci.disconnect();
    for (const el of [...ayarlananlar.keys()]) geriAl(el);
    if (acik && document.body) {
      fixedleriSigdir();
      gozlemci.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    }
  };

  function planla() {
    clearTimeout(zamanlayici);
    zamanlayici = setTimeout(tara, S.TARAMA_GECIKMESI);
  }

  const uygula = (ayar) => {
    if ('acik' in ayar) acik = !!ayar.acik;
    if (ayar.oran) oran = ayar.oran;
    let stil = document.getElementById(S.STIL_ID);
    if (acik && !stil) {
      stil = document.createElement('style');
      stil.id = S.STIL_ID;
      document.documentElement.appendChild(stil);
    } else if (!acik && stil) {
      stil.remove();
    }
    if (acik) stil.textContent = M.kokCss(oran);
    if (acik) window.addEventListener('resize', planla);
    else window.removeEventListener('resize', planla);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tara, { once: true });
    else tara();
  };

  Depolama.yukle().then(uygula);
  Depolama.izle(uygula);
})();
