// Sayfa içinde çalışır (svg-yap.mjs enjekte eder): bir DOM alt ağacının o anki çizimini
// vektör SVG öğelerine çevirir. Kutular, kenarlar, gölgeler, gradyanlar, satır satır metin,
// simgeler, resimler, iframe ve shadow DOM içleri. Konumlar getBoundingClientRect'ten gelir;
// metin genişliği textLength ile sabitlenir ki başka fontla açılsa da satır taşmasın.
(() => {
  let sayac = 0;
  const yeniId = (on) => `${on}${++sayac}`;
  const tanimlar = (window.__svgTanim = window.__svgTanim || new Map());   // id -> <defs> içeriği
  const resimId = (window.__svgResim = window.__svgResim || new Map());   // src -> sembol id
  const kac = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const aile = (f) => f.replace(/"/g, "'");
  const n = (v) => +(+v).toFixed(2);

  function boya(c) {
    const m = c && c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    const a = p.length > 3 ? p[3] : 1;
    return a === 0 ? null : { renk: `rgb(${p[0]},${p[1]},${p[2]})`, a };
  }
  const dolgu = (c, ad = "fill") => {
    const b = boya(c);
    return b ? `${ad}="${b.renk}"${b.a < 1 ? ` ${ad}-opacity="${n(b.a)}"` : ""}` : null;
  };

  // Bir belgenin (iframe olabilir) koordinatlarını kök sayfaya çevirir; iframe ölçeği dahil.
  function harita(doc) {
    if (doc === document) return { x: (x) => x, y: (y) => y, k: 1 };
    const fr = doc.defaultView.frameElement, ust = harita(fr.ownerDocument);
    const r = fr.getBoundingClientRect(), k = r.width / fr.offsetWidth;
    return { x: (x) => ust.x(r.left + x * k), y: (y) => ust.y(r.top + y * k), k: ust.k * k };
  }
  window.__dikdortgen = (el) => {
    const h = harita(el.ownerDocument), r = el.getBoundingClientRect();
    return { x: h.x(r.left), y: h.y(r.top), w: r.width * h.k, h: r.height * h.k };
  };

  const olculer = new Map();
  function fontOlcu(cs) {
    const f = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if (!olculer.has(f)) {
      const c = document.createElement("canvas").getContext("2d");
      c.font = f;
      const m = c.measureText("Hgİ");
      olculer.set(f, { asc: m.fontBoundingBoxAscent, desc: m.fontBoundingBoxDescent });
    }
    return olculer.get(f);
  }

  function golgeler(bs) {
    if (!bs || bs === "none") return [];
    return bs.split(/,(?![^(]*\))/).map((s) => {
      const renk = (s.match(/rgba?\([^)]+\)/) || [""])[0];
      const [x, y, blur = 0, yay = 0] = (s.replace(renk, "").match(/-?[\d.]+px/g) || []).map(parseFloat);
      return { renk, x, y, blur, yay, ic: /inset/.test(s) };
    });
  }

  function gradyan(bi, x, y, w, h) {
    const id = yeniId("g");
    const ic = bi.slice(bi.indexOf("(") + 1, bi.lastIndexOf(")"));
    const parca = ic.split(/,(?![^(]*\))/).map((s) => s.trim());
    const durak = (list) => list.map((p, i) => {
      // Saydam durak da kendi rengini taşır; yoksa geçiş siyaha doğru grileşir.
      const m = p.match(/rgba?\(([^)]+)\)/), q = m ? m[1].split(/[\s,/]+/).filter(Boolean).map(Number) : [0, 0, 0, 0];
      const a = q.length > 3 ? q[3] : 1, yer = p.match(/([\d.]+)%/);
      const o = yer ? +yer[1] / 100 : i / Math.max(1, list.length - 1);
      return `<stop offset="${n(o)}" stop-color="rgb(${q[0]},${q[1]},${q[2]})"${a < 1 ? ` stop-opacity="${n(a)}"` : ""}/>`;
    }).join("");
    if (bi.startsWith("linear-gradient")) {
      let aci = 180, liste = parca;
      if (/deg$/.test(parca[0])) { aci = parseFloat(parca[0]); liste = parca.slice(1); }
      const a = aci * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a);
      const L = Math.abs(w * dx) + Math.abs(h * dy), cx = x + w / 2, cy = y + h / 2;
      tanimlar.set(id, `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(cx - dx * L / 2)}" y1="${n(cy - dy * L / 2)}" x2="${n(cx + dx * L / 2)}" y2="${n(cy + dy * L / 2)}">${durak(liste)}</linearGradient>`);
    } else {
      // radial-gradient(Rx Ry at X% Y%, ...)
      const m = parca[0].match(/([\d.]+)px\s+([\d.]+)px\s+at\s+(-?[\d.]+)%\s+(-?[\d.]+)%/);
      const [rx, ry, px, py] = m ? m.slice(1).map(Number) : [w / 2, h / 2, 50, 50];
      const cx = x + w * px / 100, cy = y + h * py / 100;
      tanimlar.set(id, `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(rx)}" gradientTransform="translate(${n(cx)} ${n(cy)}) scale(1 ${n(ry / rx)}) translate(${n(-cx)} ${n(-cy)})">${durak(m ? parca.slice(1) : parca)}</radialGradient>`);
    }
    return id;
  }

  function golgeFiltresi(g, olcek) {
    const id = `golge-${Math.round(g.y * olcek)}-${Math.round(g.blur * olcek)}`;
    const b = boya(g.renk) || { renk: "rgb(0,0,0)", a: .2 };
    if (!tanimlar.has(id)) tanimlar.set(id, `<filter id="${id}" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="${n(g.x * olcek)}" dy="${n(g.y * olcek)}" stdDeviation="${n(g.blur * olcek / 2)}" flood-color="${b.renk}" flood-opacity="${n(b.a)}"/></filter>`);
    return id;
  }

  function resim(el) {
    const src = el.currentSrc || el.src;
    if (!resimId.has(src)) {
      const c = document.createElement("canvas");
      c.width = el.naturalWidth; c.height = el.naturalHeight;
      c.getContext("2d").drawImage(el, 0, 0);
      const id = yeniId("r");
      resimId.set(src, id);
      tanimlar.set(id, `<symbol id="${id}" viewBox="0 0 ${c.width} ${c.height}"><image width="${c.width}" height="${c.height}" href="${c.toDataURL("image/png")}"/></symbol>`);
    }
    return resimId.get(src);
  }

  function metin(node, h, cikti) {
    const el = node.parentElement, cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || !node.data.trim()) return;
    const renk = dolgu(cs.color);
    if (!renk) return;
    const r = node.ownerDocument.createRange(), harfler = [];
    for (let i = 0; i < node.data.length; i++) {
      r.setStart(node, i); r.setEnd(node, i + 1);
      const q = r.getClientRects()[0];
      if (!q || q.width === 0) continue;   // çökertilmiş boşluk
      harfler.push({ c: node.data[i], l: q.left, sag: q.right, t: q.top, y: q.height });
    }
    const satirlar = [];
    for (const k of harfler) {
      const son = satirlar.at(-1);
      if (son && Math.abs(son.at(-1).t - k.t) < 2 && k.l >= son.at(-1).sag - 1) son.push(k); else satirlar.push([k]);
    }
    const o = fontOlcu(cs), dil = (el.closest("[lang]") || node.ownerDocument.documentElement).lang || "tr";
    for (let st of satirlar) {
      while (st.length && /\s/.test(st[0].c)) st = st.slice(1);
      while (st.length && /\s/.test(st.at(-1).c)) st = st.slice(0, -1);
      if (!st.length) continue;
      let m = st.map((k) => k.c).join("").replace(/\s+/g, " ");
      if (cs.textTransform === "uppercase") m = m.toLocaleUpperCase(dil);
      const s = st[0].y / (o.asc + o.desc);                 // öğe dönüşümünden gelen ölçek
      const x = h.x(st[0].l), y = h.y(st[0].t + o.asc * s), w = (st.at(-1).sag - st[0].l) * h.k;
      const fs = parseFloat(cs.fontSize) * s * h.k;
      cikti.push(`<text x="${n(x)}" y="${n(y)}" font-family="${kac(aile(cs.fontFamily))}" font-size="${n(fs)}" font-weight="${cs.fontWeight}"`
        + (cs.fontStyle !== "normal" ? ` font-style="${cs.fontStyle}"` : "")
        + ` ${renk} textLength="${n(w)}" lengthAdjust="spacing" xml:space="preserve">${kac(m)}</text>`);
    }
  }

  function kutu(el, cs, R, h, yerel, cikti) {
    const x = h.x(R.left), y = h.y(R.top), w = R.width * h.k, hh = R.height * h.k, o = yerel * h.k;
    let rx = cs.borderTopLeftRadius.endsWith("%") ? parseFloat(cs.borderTopLeftRadius) / 100 * w : (parseFloat(cs.borderTopLeftRadius) || 0) * o;
    rx = Math.min(rx, w / 2, hh / 2);
    const govde = `x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(hh)}"${rx ? ` rx="${n(rx)}"` : ""}`;
    const gl = golgeler(cs.boxShadow);
    const bulanik = gl.find((g) => g.blur > 0 && !g.ic);
    const zemin = dolgu(cs.backgroundColor);
    const filtre = bulanik ? ` filter="url(#${golgeFiltresi(bulanik, o)})"` : "";
    // Zeminsiz ama gölgeli kutu (ör. gradyanlı oynatıcı) gölgesini görünmez bir dolguyla taşır.
    if (zemin || bulanik) cikti.push(`<rect ${govde} ${zemin || 'fill="rgb(255,255,255)" fill-opacity="0.01"'}${filtre}/>`);
    if (cs.backgroundImage && cs.backgroundImage !== "none") {
      for (const bi of cs.backgroundImage.split(/,(?![^(]*\))(?=\s*(?:linear|radial)-gradient)/)) {
        if (/gradient/.test(bi)) cikti.push(`<rect ${govde} fill="url(#${gradyan(bi.trim(), x, y, w, hh)})"/>`);
      }
    }
    // Halka gölgesi (0 0 0 1px): ince çerçeve gibi çizilir.
    for (const g of gl) if (!g.blur && g.yay > 0 && !g.x && !g.y) {
      const b = boya(g.renk), sp = g.yay * o;
      if (b) cikti.push(`<rect x="${n(x - sp / 2)}" y="${n(y - sp / 2)}" width="${n(w + sp)}" height="${n(hh + sp)}"${rx ? ` rx="${n(rx + sp / 2)}"` : ""} fill="none" stroke="${b.renk}" stroke-opacity="${n(b.a)}" stroke-width="${n(sp)}"/>`);
    }
    // Kenarlar: dördü aynıysa tek çerçeve, değilse kenar kenar.
    const kenar = ["Top", "Right", "Bottom", "Left"].map((s) => ({ g: (parseFloat(cs[`border${s}Width`]) || 0) * o, st: cs[`border${s}Style`], c: cs[`border${s}Color`] }));
    const ayni = kenar.every((k) => k.g === kenar[0].g && k.st === kenar[0].st && k.c === kenar[0].c);
    if (ayni && kenar[0].g > 0 && kenar[0].st !== "none") {
      const g = kenar[0].g, renk = dolgu(kenar[0].c, "stroke");
      if (renk) cikti.push(`<rect x="${n(x + g / 2)}" y="${n(y + g / 2)}" width="${n(w - g)}" height="${n(hh - g)}"${rx ? ` rx="${n(Math.max(0, rx - g / 2))}"` : ""} fill="none" ${renk} stroke-width="${n(g)}"${kenar[0].st === "dashed" ? ` stroke-dasharray="${n(g * 3)} ${n(g * 2)}"` : ""}/>`);
    } else {
      const cizgi = [[x, y + kenar[0].g / 2, x + w, y + kenar[0].g / 2], [x + w - kenar[1].g / 2, y, x + w - kenar[1].g / 2, y + hh],
        [x, y + hh - kenar[2].g / 2, x + w, y + hh - kenar[2].g / 2], [x + kenar[3].g / 2, y, x + kenar[3].g / 2, y + hh]];
      kenar.forEach((k, i) => {
        const renk = dolgu(k.c, "stroke");
        if (k.g > 0 && k.st !== "none" && renk) {
          const [a, b, c, d] = cizgi[i];
          cikti.push(`<line x1="${n(a)}" y1="${n(b)}" x2="${n(c)}" y2="${n(d)}" ${renk} stroke-width="${n(k.g)}"${k.st === "dashed" ? ` stroke-dasharray="${n(k.g * 3)} ${n(k.g * 2)}"` : ""}/>`);
        }
      });
    }
    return { x, y, w, hh, rx, o };
  }

  // ::before / ::after: yalnızca mutlak konumlu dekor (anahtar topuzu, oynat üçgeni).
  function sozde(el, cs, b, cikti) {
    for (const ps of ["::before", "::after"]) {
      const p = getComputedStyle(el, ps);
      if (!p || p.content === "none" || p.content === "normal" || p.position !== "absolute") continue;
      const pw = parseFloat(p.width) || 0, ph = parseFloat(p.height) || 0, pl = parseFloat(p.left) || 0, pt = parseFloat(p.top) || 0;
      const mm = p.transform.match(/matrix\(([^)]+)\)/), tx = mm ? +mm[1].split(",")[4] : 0;
      const bx = b.x + (pl + tx + (parseFloat(cs.borderLeftWidth) || 0)) * b.o, by = b.y + (pt + (parseFloat(cs.borderTopWidth) || 0)) * b.o;
      const sol = parseFloat(p.borderLeftWidth) || 0, ust = parseFloat(p.borderTopWidth) || 0;
      if (!pw && sol && ust && !boya(p.borderTopColor)) {           // kenarlıkla çizilmiş üçgen
        const renk = dolgu(p.borderLeftColor);
        cikti.push(`<path d="M${n(bx)} ${n(by)}l${n(sol * b.o)} ${n(ust * b.o)}l${n(-sol * b.o)} ${n(ust * b.o)}z" ${renk}/>`);
        continue;
      }
      const renk = dolgu(p.backgroundColor);
      if (!renk || !pw) continue;
      const rr = p.borderTopLeftRadius.endsWith("%") ? pw / 2 : parseFloat(p.borderTopLeftRadius) || 0;
      cikti.push(`<rect x="${n(bx)}" y="${n(by)}" width="${n(pw * b.o)}" height="${n(ph * b.o)}" rx="${n(Math.min(rr, pw / 2) * b.o)}" ${renk}/>`);
    }
  }

  function kaydirici(el, cs, b, cikti) {
    const min = +el.min || 0, max = +el.max || 100, oran = (el.value - min) / (max - min);
    const orta = b.y + b.hh / 2;
    if (cs.appearance === "none" || cs.webkitAppearance === "none") {          // Voice Tamer paneli
      const iz = (parseFloat(cs.height) || 3) * b.o, r = 6 * b.o;
      cikti.push(`<rect x="${n(b.x)}" y="${n(orta - iz / 2)}" width="${n(b.w)}" height="${n(iz)}" rx="${n(iz / 2)}" ${dolgu(cs.backgroundColor) || 'fill="rgb(82,82,91)"'}/>`);
      cikti.push(`<circle cx="${n(b.x + r + oran * (b.w - 2 * r))}" cy="${n(orta)}" r="${n(r)}" fill="rgb(228,228,231)"/>`);
    } else {                                                                     // Chrome'un varsayılan kaydırıcısı
      const iz = 4 * b.o, r = 8 * b.o, cx = b.x + r + oran * (b.w - 2 * r), vurgu = boya(cs.accentColor)?.renk || "rgb(37,99,235)";
      cikti.push(`<rect x="${n(b.x)}" y="${n(orta - iz / 2)}" width="${n(b.w)}" height="${n(iz)}" rx="${n(iz / 2)}" fill="rgb(82,82,91)"/>`);
      cikti.push(`<rect x="${n(b.x)}" y="${n(orta - iz / 2)}" width="${n(cx - b.x)}" height="${n(iz)}" rx="${n(iz / 2)}" fill="${vurgu}"/>`);
      cikti.push(`<circle cx="${n(cx)}" cy="${n(orta)}" r="${n(r)}" fill="${vurgu}"/>`);
    }
  }

  function eleman(el, h, cikti, ops, kok = false) {
    if (ops.haric.includes(el)) return;
    const etiket = el.tagName.toLowerCase();
    if (["style", "script", "head", "title", "template", "meta", "link", "noscript"].includes(etiket)) return;
    const cs = getComputedStyle(el);
    if (cs.display === "none") return;
    const op = parseFloat(cs.opacity);
    if (op === 0) return;
    const R = el.getBoundingClientRect(), yerel = el.offsetWidth ? R.width / el.offsetWidth : 1;
    const parca = [];
    let b = { x: h.x(R.left), y: h.y(R.top), w: R.width * h.k, hh: R.height * h.k, rx: 0, o: yerel * h.k };
    if (cs.visibility !== "hidden" && !(kok && ops.sadeceCocuklar)) {
      if (etiket === "html") {
        // Belgenin tuvali: body zemini html'e yayılır; iframe'in görünen alanını boyar.
        const bd = el.ownerDocument.body, zemin = boya(cs.backgroundColor) ? cs.backgroundColor : bd && getComputedStyle(bd).backgroundColor;
        const v = el.ownerDocument.defaultView, renk = dolgu(zemin || "rgb(255,255,255)");
        if (renk) parca.push(`<rect x="${n(h.x(0))}" y="${n(h.y(0))}" width="${n(v.innerWidth * h.k)}" height="${n(v.innerHeight * h.k)}" ${renk}/>`);
      } else if (!(etiket === "body" && el.ownerDocument !== document)) {
        b = kutu(el, cs, R, h, yerel, parca);
      }
      if (etiket === "img") { parca.push(`<use href="#${resim(el)}" x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.hh)}"/>`); }
      else if (etiket === "svg") {
        const c = el.cloneNode(true);
        ["class", "id", "style"].forEach((a) => c.removeAttribute(a));
        Object.entries({ x: b.x, y: b.y, width: b.w, height: b.hh }).forEach(([a, v]) => c.setAttribute(a, n(v)));
        for (const p of ["fill", "stroke"]) { const v = cs.getPropertyValue(p); c.setAttribute(p, v === "none" ? "none" : boya(v)?.renk || v); }
        for (const p of ["stroke-width", "stroke-linecap", "stroke-linejoin"]) c.setAttribute(p, cs.getPropertyValue(p).replace("px", ""));
        parca.push(new XMLSerializer().serializeToString(c).replace(/ xmlns="[^"]*"/, ""));
        return cikti.push(op < 1 ? `<g opacity="${n(op)}">${parca.join("")}</g>` : parca.join(""));
      } else if (etiket === "input" && el.type === "range") { kaydirici(el, cs, b, parca); }
      sozde(el, cs, b, parca);
    }
    if (etiket === "iframe") {
      eleman(el.contentDocument.documentElement, harita(el.contentDocument), parca, ops);
    } else if (etiket !== "svg" && etiket !== "img" && etiket !== "input") {
      const cocuklar = [];
      for (const c of (el.shadowRoot || el).childNodes) {
        if (c.nodeType === 3) { if (cs.visibility !== "hidden") metin(c, h, cocuklar); }
        else if (c.nodeType === 1) eleman(c, h, cocuklar, ops);
      }
      let ic = cocuklar.join("");
      if (ops.sarmal && ops.sarmal.el === el) ic = `<g class="${ops.sarmal.sinif}">${ic}</g>`;
      const kirp = !(kok && ops.sadeceCocuklar) && etiket !== "html" && etiket !== "body" && (cs.overflowX !== "visible" || cs.overflowY !== "visible");
      if (kirp && ic) {
        const id = yeniId("k");
        tanimlar.set(id, `<clipPath id="${id}"><rect x="${n(b.x)}" y="${n(b.y)}" width="${n(b.w)}" height="${n(b.hh)}"${b.rx ? ` rx="${n(b.rx)}"` : ""}/></clipPath>`);
        ic = `<g clip-path="url(#${id})">${ic}</g>`;
      }
      parca.push(ic);
    }
    if (parca.length) cikti.push(op < 1 ? `<g opacity="${n(op)}">${parca.join("")}</g>` : parca.join(""));
  }

  // kok: öğe; haric: çizilmeyecek öğeler; sadeceCocuklar: kökün kendi kutusu/kırpması yok;
  // sarmal: { el, sinif } — o öğenin çocukları bir <g class> içine (kaydırma animasyonu için).
  window.serilestir = (kok, { haric = [], sadeceCocuklar = false, sarmal = null } = {}) => {
    const cikti = [];
    eleman(kok, harita(kok.ownerDocument), cikti, { haric: haric.filter(Boolean), sadeceCocuklar, sarmal }, true);
    return cikti.join("");
  };
  window.svgTanimlari = () => [...tanimlar.values()].join("");
})();
