// README'de kendiliğinden oynayan kurulum animasyonlarını üretir: docs/videolar/<uzantı>.svg
//
// NotDefteri'deki sistemin aynısı: vektör SVG + CSS anahtar kareleri. GitHub hareketli GIF'e
// oynat/duraklat düğmesi koyar ve "hareketi azalt" açıkken GIF'i durdurur; <img> içindeki
// SVG'nin CSS animasyonuna dokunmaz, sayfa açılınca oynar. Sesli/tam video docs/videolar/<uzantı>.mp4.
//
// Sahne (sahne.html) her önemli anda bir kez çizilir, o anki DOM serilestir.js ile vektöre
// çevrilir; zamanlama sahnedeki gorun()/goster() çizelgesinin CSS karşılığıdır. Hareket yalnızca
// transform ve opacity; giriş ease-out, yer değiştirme ease-in-out. Animasyonsuz görüntüleyicide
// yalnızca kanca (simge, ad, tanım) görünür.
//
//     node scripts/tanitim/svg-yap.mjs [uzantı ...]     (varsayılan: dördü)
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sahneAc, KOK, bekle } from "./tarayici.mjs";

const UZANTILAR = process.argv.slice(2).length ? process.argv.slice(2) : ["oto-cozucu", "oto-cevirmen", "sola-itele", "voice-tamer"];
const AD = { "oto-cozucu": "Oto Çözücü", "oto-cevirmen": "Oto Çevirmen", "sola-itele": "Sola İtele", "voice-tamer": "Voice Tamer" };
const SERILESTIR = readFileSync(new URL("./serilestir.js", import.meta.url), "utf8");

const K = 1.2;                         // döngü kancanın oturduğu andan başlar (ilk kare de o)
const EASE_OUT = "cubic-bezier(0.33, 1, 0.68, 1)";
const IKIYAN = "cubic-bezier(0.65, 0, 0.35, 1)";
const n = (v) => +(+v).toFixed(2);

class Sahne {
  constructor(sure) { this.sure = sure; this.toplam = sure - K; this.css = []; }
  yuzde(t) { return `${Math.max(0, Math.min(100, (t - K) / this.toplam * 100)).toFixed(3)}%`; }

  // adimlar: [t (sahne saniyesi), { özellik: değer }, sonraki dilimin eğrisi?]
  kareler(ad, adimlar, koken) {
    let a = adimlar.map(([t, oz, egri]) => [t, oz, egri]);
    const once = a.filter(([t]) => t <= K), sonra = a.filter(([t]) => t > K);
    a = [[K, (once.at(-1) || a[0])[1], (once.at(-1) || a[0])[2]], ...sonra];
    if (a.at(-1)[0] < this.sure) a.push([this.sure, a.at(-1)[1]]);
    const satirlar = a.map(([t, oz, egri]) => `${this.yuzde(t)}{${Object.entries(oz).map(([k, v]) => `${k}:${v}`).join(";")};animation-timing-function:${egri || "linear"}}`);
    this.css.push(`@keyframes ${ad}{${satirlar.join("")}}.${ad}{animation:${ad} ${n(this.toplam)}s infinite${koken ? `;transform-origin:${n(koken[0])}px ${n(koken[1])}px` : ""}}`);
  }
  // sahne.html'deki gorun(): a'da kayarak belirir, b'de söner.
  gorun(ad, a, b = 1e9, { dy = 26, sure = .4, cik = .28, olcek = 0 } = {}, koken) {
    const gizli = { opacity: 0, transform: `translateY(${dy}px) scale(${1 - olcek})` };
    const acik = { opacity: 1, transform: "translateY(0px) scale(1)" };
    const adim = [[a, gizli, EASE_OUT], [a + sure, acik]];
    if (b < this.sure) adim.push([b, acik], [b + cik, { opacity: 0, transform: `translateY(${-dy * .5}px) scale(1)` }]);
    this.kareler(ad, adim, koken);
  }
  // Anında belirip kaybolan öğe (durum değişimi).
  goster(ad, a, b = 1e9) {
    const adim = [[a, { opacity: 0 }], [a + .001, { opacity: 1 }]];
    if (b < this.sure) adim.push([b, { opacity: 1 }], [b + .001, { opacity: 0 }]);
    this.kareler(ad, adim);
  }
  // Belirli bir aralıkta solarak açılır/kapanır.
  sol(ad, a, b, gir = true) { this.kareler(ad, [[a, { opacity: gir ? 0 : 1 }, gir ? EASE_OUT : "linear"], [b, { opacity: gir ? 1 : 0 }]]); }
}

const ikiyan = (x) => { x = Math.min(1, Math.max(0, x)); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
function imlecKonum(YOL, t) {                          // sahne.html'deki imlecKonum'un aynısı
  if (t <= YOL[0][0]) return YOL[0][1];
  for (let i = 1; i < YOL.length; i++) {
    const [t1, a] = YOL[i - 1], [t2, b] = YOL[i];
    if (t <= t2) { const k = ikiyan((t - t1) / (t2 - t1)); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
  }
  return YOL.at(-1)[1];
}

async function uret(u) {
  const { ev, kapat } = await sahneAc(u);
  await ev(SERILESTIR);
  const q = (s) => `document.querySelector(${JSON.stringify(s)})`;
  const iq = (s) => `document.querySelector("#sayfa-cerceve").contentDocument.querySelector(${JSON.stringify(s)})`;
  // Uzantıların kendi CSS geçişleri (anahtar kayması, balonun belirmesi) bitmeden çizilmesin.
  const an = async (t) => { await ev(`window.render(${t})`); await bekle(250); };
  const ciz = async (t, kok, ops = "{}") => { if (t != null) await an(t); return ev(`serilestir(${kok}, ${ops})`); };
  const dik = async (kok) => ev(`__dikdortgen(${kok})`);
  const haric = (...l) => `{ haric: [${l.join(",")}] }`;

  const SURE = await ev("window.SURE"), R = await ev("window.R");
  const YOL = await ev("window.YOL"), TIKLAR = await ev("window.TIKLAR"), BASLIKLAR = await ev("window.BASLIKLAR");
  const s = new Sahne(SURE);
  const g = (sinif, ic, ek = "") => `<g class="${sinif}"${ek}>${ic}</g>`;
  const kirp = [];                                    // elle kurulan kırpma yolları
  const kirpma = (id, r, rx = 0) => { kirp.push(`<clipPath id="${id}"><rect x="${n(r.x)}" y="${n(r.y)}" width="${n(r.w)}" height="${n(r.h)}"${rx ? ` rx="${rx}"` : ""}/></clipPath>`); return `clip-path="url(#${id})"`; };
  const merkez = (r) => [r.x + r.w / 2, r.y + r.h / 2];

  const zemin = await ciz(0, q(".zemin-desen"));

  // 1 · Kanca: döngü başında solarak gelir, 2,75 sn'de söner.
  const kanca = await ciz(1.5, q("#kanca"));
  s.kareler("kanca", [[K, { opacity: 0 }, EASE_OUT], [K + .35, { opacity: 1, transform: "translateY(0px)" }],
    [2.75, { opacity: 1, transform: "translateY(0px)" }], [3.03, { opacity: 0, transform: "translateY(-15px)" }]]);

  // Tarayıcı penceresi
  await ev("window.render(5)");                    // pencere oturmuşken ölç: giriş animasyonu kırpmayı kaydırmasın
  const P = await dik(q("#pencere")), IC = await dik(q("#icerik"));
  s.gorun("pencere", 3.0, 20.6, { dy: 40, sure: .5, olcek: .03 }, merkez(P));
  const cerceve = await ciz(5, q("#pencere"), haric(...["#sekme", "#adres", "#arac-uzanti", "#icerik", "#menu", "#altmenu", "#popup"].map(q)));
  const durumlar = [[5, 0, 8.28], [9, 8.28, R - .09], [R + .5, R - .09, 1e9]];
  let ust = "";
  for (const [i, [t, a, b]] of durumlar.entries()) {
    s.goster(`adres${i}`, a, b);
    ust += g(`adres${i}`, (await ciz(t, q("#sekme"))) + (await ciz(null, q("#adres"))));
  }
  s.sol("arac-uzanti", 14.3, 14.6);
  ust += g("arac-uzanti", await ciz(15, q("#arac-uzanti")));

  // 2 · Releases ve indirme
  let icerik = `<rect x="${n(IC.x)}" y="${n(IC.y)}" width="${n(IC.w)}" height="${n(IC.h)}" fill="#fff"/>`;
  const sira = ["oto-cevirmen", "oto-cozucu", "sola-itele", "voice-tamer"].indexOf(u);
  let surum = await ciz(4.0, q("#surumler"), `{ haric: [...document.querySelectorAll(".varlik")] }`);
  s.sol("secili", 4.3, 4.4);
  surum += g("secili", await ciz(5, `document.querySelectorAll(".vurgu-z")[${sira}]`));
  for (let i = 0; i < 4; i++) {
    s.gorun(`satir${i}`, 3.2 + i * .08, 1e9, { dy: 14, sure: .35 });
    surum += g(`satir${i}`, await ciz(4.0, `document.querySelectorAll(".varlik")[${i}]`));
  }
  s.sol("surumler", 8.15, 8.27, false);
  icerik += g("surumler", surum);
  s.gorun("indirme", 4.45, 6.1, { dy: -16, sure: .3 });
  icerik += g("indirme", await ciz(5.5, q("#indirme")));
  const kl = await dik(q("#klasor"));
  s.gorun("klasor", 4.85, 6.15, { dy: 30, sure: .4 });
  await ev("window.render(5.3)");
  const zip = await dik(q("#zip-simge"));
  s.kareler("zip", [[5.4, { opacity: 1, transform: "scale(1)" }, EASE_OUT], [5.7, { opacity: 0, transform: "scale(0.85)" }]], merkez(zip));
  s.kareler("dosya", [[5.4, { opacity: 0, transform: "scale(0.85)" }, EASE_OUT], [5.7, { opacity: 1, transform: "scale(1)" }]], merkez(zip));
  s.goster("ad-zip", 0, 5.55); s.goster("ad-klasor", 5.55);
  s.gorun("klasor-ic", 5.65, 1e9, { dy: 14, sure: .3 });
  icerik += g("klasor", (await ciz(6.0, q("#klasor"), haric(...["#zip-simge", "#klasor-simge", "#dosya-ad", "#dosya-alt", "#klasor-icerik"].map(q))))
    + g("zip", await ciz(5.3, q("#zip-simge"))) + g("dosya", await ciz(6.0, q("#klasor-simge")))
    + g("ad-zip", (await ciz(5.3, q("#dosya-ad"))) + (await ciz(null, q("#dosya-alt"))))
    + g("ad-klasor", (await ciz(6.0, q("#dosya-ad"))) + (await ciz(null, q("#dosya-alt"))))
    + g("klasor-ic", await ciz(6.0, q("#klasor-icerik"))));

  // 3-4 · Uzantılar sayfası
  s.kareler("uzantilar", [[8.3, { opacity: 0 }, EASE_OUT], [8.5, { opacity: 1 }], [R - .25, { opacity: 1 }], [R - .11, { opacity: 0 }]]);
  let uz = await ciz(9.0, q("#uzantilar"), haric(...["#gm", "#gm-cubuk", "#bos", "#kart", "#secici"].map(q)));
  s.sol("gm-kapali", 10.1, 10.3, false); s.sol("gm-acik", 10.1, 10.3);
  uz += g("gm-kapali", await ciz(9.0, q("#gm"))) + g("gm-acik", await ciz(10.5, q("#gm")));
  await ev("window.render(11)");
  const cub = await dik(q("#gm-cubuk"));          // çubuk açıkken: kayarak açılacağı alan
  s.kareler("cubuk", [[10.15, { transform: "translateY(-72px)" }, EASE_OUT], [10.5, { transform: "translateY(0px)" }]]);
  uz += `<g ${kirpma("cubuk-k", cub)}>` + g("cubuk", await ciz(11, q("#gm-cubuk"))) + "</g>";
  s.kareler("bos", [[10.15, { opacity: 1, transform: "translateY(0px)" }, EASE_OUT], [10.5, { opacity: 1, transform: "translateY(72px)" }],
    [14.05, { opacity: 1, transform: "translateY(72px)" }], [14.15, { opacity: 0, transform: "translateY(72px)" }]]);
  uz += g("bos", await ciz(9.0, q("#bos")));
  await ev("window.render(12.9)");
  s.gorun("secici", 12.4, 13.9, { dy: 24, sure: .3, olcek: .04 }, merkez(await dik(q("#secici"))));
  s.goster("secili-satir", 13.22);
  uz += g("secici", (await ciz(12.9, q("#secici"))) + g("secili-satir", await ciz(13.5, q("#sec-klasor"))));
  await ev("window.render(15)");
  s.gorun("kart", 14.1, 1e9, { dy: 24, sure: .4, olcek: .04 }, merkez(await dik(q("#kart"))));
  uz += g("kart", await ciz(15, q("#kart")));
  icerik += g("uzantilar", uz);

  // 5 · Sonuç: uzantının gerçek kodunun çizdiği hâl
  s.sol("sonuc", R - .08, R + .1);
  let sonuc = "", pencereUstu = "";
  if (u === "sola-itele") {
    s.goster("sayfa-once", 0, R + 1.25); s.goster("sayfa-sonra", R + 1.25);
    sonuc += g("sayfa-once", await ciz(R + .3, q("#sayfa-cerceve"))) + g("sayfa-sonra", await ciz(R + 2.2, q("#sayfa-cerceve")));
    s.gorun("sinir", R + 1.4, 1e9, { dy: 0, sure: .3 }); s.gorun("sinir-etiket", R + 1.5, 1e9, { dy: 10, sure: .3 });
    sonuc += g("sinir", await ciz(R + 2.2, q("#sinir"))) + g("sinir-etiket", await ciz(null, q("#sinir-etiket")));
    s.gorun("popup", R + .65, R + 1.9, { dy: -10, sure: .22, cik: .2 });
    s.goster("popup-kapali", 0, R + 1.25); s.goster("popup-acik", R + 1.25);
    pencereUstu += g("popup", g("popup-kapali", await ciz(R + 1.0, q("#popup"))) + g("popup-acik", await ciz(R + 1.6, q("#popup"))));
  } else if (u === "voice-tamer") {
    sonuc += await ciz(R + .3, q("#sayfa-cerceve"), `{ haric: [${iq("#vt-panel")}] }`);
    const govde = `${iq("#vt-panel")}.shadowRoot.querySelector(".b")`;
    sonuc += await ciz(null, iq("#vt-panel"), `{ haric: [${govde}] }`);
    const KY = await ev("window.KAYDIRMA"), B = await dik(govde);
    s.kareler("kaydir", [[KY.bas, { transform: "translateY(0px)" }, IKIYAN], [KY.bit, { transform: `translateY(${-n(KY.maks)}px)` }]]);
    s.goster("ayar-hafif", 0, KY.tik); s.goster("ayar-orta", KY.tik);
    const hafif = await ciz(null, govde, "{ sadeceCocuklar: true }");
    await an(R + 2.6); await ev(`${govde}.scrollTop = 0`);
    const orta = await ciz(null, govde, "{ sadeceCocuklar: true }");
    sonuc += `<g ${kirpma("panel-k", B)}>` + g("kaydir", g("ayar-hafif", hafif) + g("ayar-orta", orta)) + "</g>";
  } else {
    sonuc += await ciz(R + .3, q("#sayfa-cerceve"));
    await ev(`window.render(${R + 2})`);
    const S = await ev("window.SECIM");
    // Seçim vurgusu: çarpma karışımıyla zemini boyar, yazıyı örtmez; sağa doğru büyür.
    s.kareler("secim", [[S.A, { transform: "scaleX(0)" }, IKIYAN], [S.B, { transform: "scaleX(1)" }]], [S.x, S.y]);
    sonuc += `<rect class="secim" x="${n(S.x)}" y="${n(S.y)}" width="${n(S.w)}" height="${n(S.h)}" fill="rgb(200,200,200)" style="mix-blend-mode:multiply"/>`;
    s.goster("balon", S.B);
    sonuc += g("balon", await ciz(R + 2, iq(u === "oto-cozucu" ? "[data-cozucu]" : "ceviri-balonu")));
  }
  icerik += g("sonuc", sonuc);

  // Chrome menüsü (⋮ → Uzantılar → Uzantıları yönet)
  await ev("window.render(7.3)");
  const M = await dik(q("#menu"));
  s.gorun("menu", 6.9, 8.15, { dy: -8, sure: .18, cik: .12, olcek: .04 }, [M.x + M.w, M.y]);
  s.goster("menu-uzantilar", 7.42, 8.15);
  const menu = g("menu", (await ciz(7.3, q("#menu"))) + g("menu-uzantilar", await ciz(7.7, q("#m-uzantilar"))));
  s.gorun("altmenu", 7.5, 8.15, { dy: 0, sure: .15, cik: .12 });
  s.goster("menu-yonet", 7.95, 8.15);
  const altmenu = g("altmenu", (await ciz(7.8, q("#altmenu"))) + g("menu-yonet", await ciz(8.05, q("#m-yonet"))));

  // Pencerenin gölgesi kırpmanın dışında: kırpma kutunun kendi gölgesini de kesiyordu.
  const pencere = `<rect x="${n(P.x)}" y="${n(P.y)}" width="${n(P.w)}" height="${n(P.h)}" rx="18" fill="#fff" filter="url(#pencere-golge)"/><g ${kirpma("pencere-k", P, 18)}>${cerceve}${ust}<g ${kirpma("icerik-k", IC)}>${icerik}</g>${menu}${altmenu}${pencereUstu}</g>`;

  // Adım başlıkları
  let basliklar = "";
  for (const [i, [a, z]] of BASLIKLAR.entries()) {
    s.gorun(`baslik${i}`, a, z, { dy: 18, sure: .35, cik: .25 });
    basliklar += g(`baslik${i} gecici`, await ciz(a + .6, q("#baslik")));
  }

  // 6 · Kapanış; döngü başa dönmeden önce söner.
  let kapanis = "";
  for (const [i, id] of ["#kp-simge", "#kp-ad", "#kp-adres", "#kp-adim", "#kp-tar"].entries()) {
    await ev("window.render(22.8)");
    s.gorun(`kp${i}`, 20.85 + i * .15, 1e9, { dy: 26, olcek: i === 0 ? .1 : 0 }, merkez(await dik(q(id))));
    kapanis += g(`kp${i} gecici`, await ciz(22.8, q(id)));
  }
  s.kareler("kapanis", [[SURE - .45, { opacity: 1 }], [SURE, { opacity: 0 }]]);

  // İşaretçi ve tık halkaları (sahne.html'deki yol ve tık anları)
  s.kareler("imlec-yol", YOL.map(([t, [x, y]]) => [t, { transform: `translate(${n(x - 8)}px, ${n(y - 4)}px)` }, IKIYAN]));
  s.kareler("imlec", [[3.4, { opacity: 0 }], [3.65, { opacity: 1 }], [19.9, { opacity: 1 }], [20.2, { opacity: 0 }]]);
  const tiklar = [...TIKLAR].sort((a, b) => a - b);
  s.kareler("imlec-tik", tiklar.flatMap((k) => [[k, { transform: "scale(1)" }], [k + .001, { transform: "scale(0.88)" }],
    [k + .12, { transform: "scale(0.88)" }], [k + .121, { transform: "scale(1)" }]]));
  s.css.push(".imlec-tik{transform-box:fill-box;transform-origin:center}");
  let halkalar = "";
  for (const [i, k] of tiklar.entries()) {
    const [x, y] = imlecKonum(YOL, k), yer = `translate(${n(x)}px, ${n(y)}px)`;
    s.kareler(`halka${i}`, [[k, { opacity: 0, transform: `${yer} scale(0.4)` }], [k + .001, { opacity: .9, transform: `${yer} scale(0.4)` }, EASE_OUT],
      [k + .45, { opacity: 0, transform: `${yer} scale(1.2)` }]]);
    halkalar += `<circle class="halka${i} gecici" r="35" fill="none" stroke="#2563eb" stroke-width="3"/>`;
  }
  const imlec = `<g class="imlec gecici"><g class="imlec-yol"><g class="imlec-tik"><path d="M5 2l14 11.5-6.2.8 3.6 7.2-2.9 1.4-3.6-7.3L5 20z" `
    + `transform="scale(1.8333)" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round" filter="url(#imlec-golge)"/></g></g></g>`;

  const tanim = await ev("svgTanimlari()");
  await kapat();
  const baslik = `${AD[u]}: Chrome menüsünden kurulum (⋮ → Uzantılar → Uzantıları yönet, Geliştirici modu, Paketlenmemiş öğe yükle) ve ilk kullanım`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" role="img" aria-label="${baslik}"><title>${baslik}</title>`
    + `<defs>${tanim}${kirp.join("")}<filter id="pencere-golge" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="30" stdDeviation="30" flood-color="rgb(31,35,48)" flood-opacity="0.28"/></filter><filter id="imlec-golge" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.2" flood-opacity="0.3"/></filter></defs>`
    // Animasyonsuz görüntüleyicide yalnızca kanca görünür; zamanlı katmanlar gizli başlar.
    + `<style>.gecici{opacity:0}.pencere{opacity:0}${s.css.join("")}</style>`
    + zemin + g("kanca", kanca) + g("pencere", pencere) + basliklar + g("kapanis", kapanis) + halkalar + imlec + "</svg>\n";
  const yol = join(KOK, "docs", "videolar", `${u}.svg`);
  writeFileSync(yol, svg);
  console.log(`${u}: ${(svg.length / 1024).toFixed(0)} KB → docs/videolar/${u}.svg`);
}

for (const u of UZANTILAR) await uret(u);
