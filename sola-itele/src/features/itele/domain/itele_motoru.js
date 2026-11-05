// Domain katmanı: sayfayı sola itmenin saf hesabı. DOM ve chrome API'si bilmez,
// ölçülmüş kutuları alır, uygulanacak CSS değerlerini döndürür. Node ile test edilir.
(function (global) {
  'use strict';

  // Kök daraltma. position:relative, konumlu atası olmayan absolute öğeler de
  // daraltılmış alana göre yerleşsin diye.
  const kokCss = (oran) => `html{width:${oran * 100}vw!important;max-width:${oran * 100}vw!important;min-width:0!important;margin:0!important;position:relative!important}`;

  /* position:fixed öğeler html genişliğine değil pencereye göre konumlanır; sınırı
   * taşanları sol alana sığdırır. Dokunulmayacaksa null döner.
   * kutu: getBoundingClientRect() ({ left, right, width })
   * cssSol: hesaplanmış `left` değeri (px sayısı ya da NaN) */
  function fixedYerlesim(kutu, genislik, oran, cssSol) {
    const sinir = genislik * oran;
    const sagBosluk = genislik - kutu.right;
    const ortali = Math.abs(kutu.left - sagBosluk) <= 2;
    if (!kutu.width || (!ortali && kutu.right <= sinir + 1)) return null;

    let w = Math.min(kutu.width, sinir);
    let hedefSol;
    if (ortali) hedefSol = (sinir - w) / 2; // ortalanmış / tam genişlik
    else if (kutu.left < sagBosluk) { hedefSol = kutu.left; w = Math.min(w, sinir - kutu.left); } // sola dayalı
    else hedefSol = Math.max(0, sinir - sagBosluk - w); // sağa dayalı

    const degerler = { left: `${(isNaN(cssSol) ? kutu.left : cssSol) + hedefSol - kutu.left}px`, right: 'auto' };
    if (w < kutu.width) Object.assign(degerler, { 'box-sizing': 'border-box', width: `${w}px`, 'min-width': '0px', 'max-width': `${w}px` });
    return degerler;
  }

  const IteleMotoru = { kokCss, fixedYerlesim };
  if (typeof module !== 'undefined' && module.exports) module.exports = IteleMotoru;
  global.IteleMotoru = IteleMotoru;
})(typeof self !== 'undefined' ? self : this);
