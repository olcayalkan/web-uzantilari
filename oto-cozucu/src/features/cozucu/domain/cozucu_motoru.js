// Oto Çözücü — CTF kodlama/şifre motoru.
// Hem ayrı dosya (popup + arka plan ortak), hem çift yönlü: her yöntemde
// coz = decode/decrypt, kodla = encode/encrypt. Otomatik tanıma, çözülen metnin
// "doğal dil" benzerliğine göre puanlar (CyberChef "Magic" mantığı).

(function (global) {
  "use strict";

  // --- Bayt yardımcıları ---
  const ENC = new TextEncoder();
  function metniBaytlar(s) { return ENC.encode(s); }
  function baytlariMetne(b) { return new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(b)); }
  function baytlariBinary(b) { let s = ""; for (const x of b) s += String.fromCharCode(x); return s; }
  function binaryBaytlar(bin) { return Uint8Array.from(bin, (c) => c.charCodeAt(0)); }

  function modTers(a, m) {
    a = ((a % m) + m) % m;
    for (let x = 1; x < m; x++) if ((a * x) % m === 1) return x;
    return null;
  }

  // İngilizce + Türkçe'de en sık görülen harf ikilileri. Gerçek metni, aynı
  // harf/sesli dağılımına sahip anagram/ters diziden ayırmak için (ör. "Merhaba"
  // vs "nonuerZ"): gerçek kelimelerde bu ikililer yoğun geçer.
  const BIGRAM = new Set((
    "th he in er an re on at en nd ti es or te of ed is it al ar st to nt ng se ha as ou io le ve co me de hi ri ro ic ne ea ra ce li ch ll be ma si om ur ca el ta la ns di so sa em " +
    "la ar en ir bi ki ni ek ak il im ya ye na da ba ca sı li lı me mi ra ri yo du bu"
  ).split(" "));

  // --- Okunabilirlik puanı (0..1): gerçek metni çöpten ayırır ---
  function okunabilirlikPuani(metin) {
    const dizi = [...metin];
    const n = dizi.length;
    if (n === 0) return 0;
    let yaz = 0, harf = 0, sesli = 0, bosluk = 0, rakamSembol = 0;
    for (const ch of dizi) {
      const k = ch.codePointAt(0);
      if (k === 9 || k === 10 || k === 13 || (k >= 32 && k <= 126) || k > 160) yaz++;
      if (/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(ch)) {
        harf++;
        if (/[AEIOUÜÖIİaeıioöuü]/.test(ch)) sesli++;
      } else if (ch === " " || ch === "\n" || ch === "\t") bosluk++;
      else if (/[^\s]/.test(ch)) rakamSembol++;
    }
    const yazOran = yaz / n;
    if (yazOran < 0.85) return yazOran * 0.3;

    // Bigram frekansı: bitişik harf çiftlerinin kaçı yaygın listede?
    const kucuk = metin.toLowerCase();
    let ikiliToplam = 0, ikiliEslesen = 0;
    for (let i = 0; i < kucuk.length - 1; i++) {
      if (/[a-zçğıöşü]/.test(kucuk[i]) && /[a-zçğıöşü]/.test(kucuk[i + 1])) {
        ikiliToplam++;
        if (BIGRAM.has(kucuk.substr(i, 2))) ikiliEslesen++;
      }
    }
    const bigramPuan = ikiliToplam ? ikiliEslesen / ikiliToplam : 0;

    const harfOran = harf / n;
    const sesliOran = harf ? sesli / harf : 0;
    const sesliPuan = 1 - Math.min(1, Math.abs(sesliOran - 0.42) / 0.42);
    const sembolPuan = 1 - Math.min(1, (rakamSembol / n) * 2.2);
    const boslukBonus = bosluk > 0 ? 1 : 0.9;
    const temel = yazOran * 0.25 + harfOran * 0.15 + sesliPuan * 0.2 + sembolPuan * 0.15 + bigramPuan * 0.25;
    return temel * boslukBonus;
  }

  // Çıktı temiz bir kodlamaya mı benziyor? (çok katlı CTF'de ara-katman sinyali)
  // Örn. Base64 çözümü düzgün hex dizisiyse, bir sonraki katman olması muhtemel.
  function yapiliMi(s) {
    const t = s.trim().replace(/\s+/g, "");
    if (t.length < 4) return false;
    if (/^[0-9a-fA-F]+$/.test(t) && t.length % 2 === 0) return true;       // hex
    if (/^[A-Za-z0-9+/_-]+={0,2}$/.test(t) && t.length % 4 === 0 && t.length >= 8) return true; // base64
    if (/^[01]+$/.test(t) && t.length % 8 === 0) return true;              // binary
    return false;
  }

  // Brute yardımcısı: adayları puanla, en iyisini {cikti, not} döndür.
  function enIyi(adaylar) {
    let en = null, enP = -1;
    for (const a of adaylar) {
      if (!a || !a.cikti) continue;
      const p = okunabilirlikPuani(a.cikti);
      if (p > enP) { enP = p; en = a; }
    }
    return en;
  }

  // ===================== KODLAMALAR =====================

  // Base64 / Base64URL
  function b64Coz(g) {
    let s = g.trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(s) || s.length < 4) return null;
    while (s.length % 4) s += "=";
    try { return baytlariMetne(binaryBaytlar(atob(s))); } catch (_) { return null; }
  }
  function b64Kodla(g) { return btoa(baytlariBinary(metniBaytlar(g))); }

  // Base32 (RFC 4648)
  const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  function b32Coz(g) {
    const t = g.trim().toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
    if (t.length < 2 || !/^[A-Z2-7]+$/.test(t)) return null;
    let bit = 0, deg = 0; const b = [];
    for (const ch of t) { const i = B32.indexOf(ch); if (i < 0) return null; deg = (deg << 5) | i; bit += 5; if (bit >= 8) { bit -= 8; b.push((deg >> bit) & 255); } }
    return b.length ? baytlariMetne(b) : null;
  }
  function b32Kodla(g) {
    const bytes = metniBaytlar(g); let bit = 0, deg = 0, o = "";
    for (const x of bytes) { deg = (deg << 8) | x; bit += 8; while (bit >= 5) { bit -= 5; o += B32[(deg >> bit) & 31]; } }
    if (bit) o += B32[(deg << (5 - bit)) & 31];
    while (o.length % 8) o += "=";
    return o;
  }

  // Base58 (Bitcoin)
  const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  function b58Coz(g) {
    const t = g.trim(); if (!t || /[^1-9A-HJ-NP-Za-km-z]/.test(t)) return null;
    let n = 0n; for (const ch of t) { const i = B58.indexOf(ch); if (i < 0) return null; n = n * 58n + BigInt(i); }
    const b = []; while (n > 0n) { b.unshift(Number(n & 255n)); n >>= 8n; }
    for (const ch of t) { if (ch === "1") b.unshift(0); else break; }
    return b.length ? baytlariMetne(b) : null;
  }
  function b58Kodla(g) {
    let bytes = [...metniBaytlar(g)], n = 0n; for (const x of bytes) n = n * 256n + BigInt(x);
    let o = ""; while (n > 0n) { o = B58[Number(n % 58n)] + o; n /= 58n; }
    for (const x of bytes) { if (x === 0) o = "1" + o; else break; }
    return o || "1";
  }

  // Base62
  const B62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  function b62Coz(g) {
    const t = g.trim(); if (!t || /[^0-9A-Za-z]/.test(t)) return null;
    let n = 0n; for (const ch of t) { const i = B62.indexOf(ch); if (i < 0) return null; n = n * 62n + BigInt(i); }
    const b = []; while (n > 0n) { b.unshift(Number(n & 255n)); n >>= 8n; }
    return b.length ? baytlariMetne(b) : null;
  }
  function b62Kodla(g) {
    let n = 0n; for (const x of metniBaytlar(g)) n = n * 256n + BigInt(x);
    let o = ""; while (n > 0n) { o = B62[Number(n % 62n)] + o; n /= 62n; } return o || "0";
  }

  // Base85 / Ascii85
  function b85Coz(g) {
    let t = g.trim().replace(/^<~/, "").replace(/~>$/, "").replace(/\s+/g, "");
    if (!t || /[^!-u z]/.test(t)) return null;
    const out = []; let i = 0;
    while (i < t.length) {
      if (t[i] === "z") { out.push(0, 0, 0, 0); i++; continue; }
      let grup = t.slice(i, i + 5); const eksik = 5 - grup.length;
      grup += "u".repeat(eksik); let n = 0;
      for (const ch of grup) { const v = ch.charCodeAt(0) - 33; if (v < 0 || v > 84) return null; n = n * 85 + v; }
      const b = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
      for (let j = 0; j < 4 - eksik; j++) out.push(b[j]);
      i += 5;
    }
    return out.length ? baytlariMetne(out) : null;
  }
  function b85Kodla(g) {
    const bytes = [...metniBaytlar(g)]; let o = "";
    for (let i = 0; i < bytes.length; i += 4) {
      const grup = bytes.slice(i, i + 4); const eksik = 4 - grup.length;
      while (grup.length < 4) grup.push(0);
      let n = ((grup[0] << 24) | (grup[1] << 16) | (grup[2] << 8) | grup[3]) >>> 0;
      let bes = ""; for (let j = 0; j < 5; j++) { bes = String.fromCharCode((n % 85) + 33) + bes; n = Math.floor(n / 85); }
      o += bes.slice(0, 5 - eksik);
    }
    return o;
  }

  // Base45 (RFC 9285)
  const B45 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
  function b45Coz(g) {
    const t = g.trim(); if (!t) return null;
    for (const ch of t) if (B45.indexOf(ch) < 0) return null;
    const out = [];
    for (let i = 0; i < t.length; ) {
      if (t.length - i >= 3) { const n = B45.indexOf(t[i]) + B45.indexOf(t[i + 1]) * 45 + B45.indexOf(t[i + 2]) * 2025; if (n > 65535) return null; out.push((n >> 8) & 255, n & 255); i += 3; }
      else if (t.length - i === 2) { const n = B45.indexOf(t[i]) + B45.indexOf(t[i + 1]) * 45; if (n > 255) return null; out.push(n); i += 2; }
      else return null;
    }
    return out.length ? baytlariMetne(out) : null;
  }
  function b45Kodla(g) {
    const bytes = [...metniBaytlar(g)]; let o = "";
    for (let i = 0; i < bytes.length; i += 2) {
      if (bytes.length - i >= 2) { let n = bytes[i] * 256 + bytes[i + 1]; const c = n % 45; n = (n - c) / 45; const d = n % 45; const e = (n - d) / 45; o += B45[c] + B45[d] + B45[e]; }
      else { let n = bytes[i]; o += B45[n % 45] + B45[(n - (n % 45)) / 45]; }
    }
    return o;
  }

  // Hex
  function hexCoz(g) {
    const t = g.trim().replace(/0x/gi, "").replace(/[\s:,-]/g, "");
    if (t.length < 2 || t.length % 2 || !/^[0-9a-fA-F]+$/.test(t)) return null;
    const b = []; for (let i = 0; i < t.length; i += 2) b.push(parseInt(t.substr(i, 2), 16));
    return baytlariMetne(b);
  }
  function hexKodla(g) { return [...metniBaytlar(g)].map((x) => x.toString(16).padStart(2, "0")).join(""); }

  // Octal ASCII
  function octCoz(g) {
    const p = g.trim().split(/[\s,]+/); if (p.length < 1 || !p.every((x) => /^[0-7]{1,3}$/.test(x) && parseInt(x, 8) <= 255)) return null;
    return baytlariMetne(p.map((x) => parseInt(x, 8)));
  }
  function octKodla(g) { return [...metniBaytlar(g)].map((x) => x.toString(8)).join(" "); }

  // Decimal ASCII
  function decCoz(g) {
    const p = g.trim().split(/[\s,]+/); if (p.length < 2 || !p.every((x) => /^\d{1,3}$/.test(x) && +x >= 1 && +x <= 255)) return null;
    return baytlariMetne(p.map((x) => +x));
  }
  function decKodla(g) { return [...metniBaytlar(g)].join(" "); }

  // Binary
  function binCoz(g) {
    const p = g.trim().split(/\s+/); if (!p.length || !p.every((x) => /^[01]{8}$/.test(x))) return null;
    return baytlariMetne(p.map((x) => parseInt(x, 2)));
  }
  function binKodla(g) { return [...metniBaytlar(g)].map((x) => x.toString(2).padStart(8, "0")).join(" "); }

  // URL
  function urlCoz(g) { if (!/%[0-9a-fA-F]{2}/.test(g)) return null; try { return decodeURIComponent(g.replace(/\+/g, " ")); } catch (_) { return null; } }
  function urlKodla(g) { return encodeURIComponent(g); }

  // HTML varlıkları
  const HTMLE = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'" };
  function htmlCoz(g) {
    if (!/&#?\w+;/.test(g)) return null;
    let s = g.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&\w+;/g, (m) => HTMLE[m] || m);
    return s === g ? null : s;
  }
  function htmlKodla(g) { return g.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  // Unicode \uXXXX
  function uniCoz(g) { if (!/\\u[0-9a-fA-F]{4}/.test(g)) return null; return g.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); }
  function uniKodla(g) { return [...g].map((c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")).join(""); }

  // Quoted-Printable
  function qpCoz(g) { if (!/=[0-9A-Fa-f]{2}/.test(g) && !/=\r?\n/.test(g)) return null; const s = g.replace(/=\r?\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); return s === g ? null : s; }
  function qpKodla(g) { return [...metniBaytlar(g)].map((x) => (x >= 33 && x <= 126 && x !== 61) || x === 32 ? String.fromCharCode(x) : "=" + x.toString(16).toUpperCase().padStart(2, "0")).join(""); }

  // basE91 (Joachim Henke)
  const B91 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~\"";
  function b91Coz(g) {
    const t = g.trim(); if (t.length < 2) return null;
    let v = -1, b = 0, n = 0; const out = [];
    for (const c of t) { const p = B91.indexOf(c); if (p < 0) return null; if (v < 0) v = p; else { v += p * 91; b |= v << n; n += (v & 8191) > 88 ? 13 : 14; while (n >= 8) { out.push(b & 255); b >>= 8; n -= 8; } v = -1; } }
    if (v >= 0) out.push((b | (v << n)) & 255);
    return out.length ? baytlariMetne(out) : null;
  }
  function b91Kodla(g) {
    const bytes = metniBaytlar(g); let b = 0, n = 0, o = "";
    for (const x of bytes) { b |= x << n; n += 8; if (n > 13) { let v = b & 8191; if (v > 88) { b >>= 13; n -= 13; } else { v = b & 16383; b >>= 14; n -= 14; } o += B91[v % 91] + B91[Math.floor(v / 91)]; } }
    if (n) { o += B91[b % 91]; if (n > 7 || b > 90) o += B91[Math.floor(b / 91)]; }
    return o;
  }

  // ===================== GÖRSEL / FONETİK =====================

  const MORSE = { ".-": "A", "-...": "B", "-.-.": "C", "-..": "D", ".": "E", "..-.": "F", "--.": "G", "....": "H", "..": "I", ".---": "J", "-.-": "K", ".-..": "L", "--": "M", "-.": "N", "---": "O", ".--.": "P", "--.-": "Q", ".-.": "R", "...": "S", "-": "T", "..-": "U", "...-": "V", ".--": "W", "-..-": "X", "-.--": "Y", "--..": "Z", "-----": "0", ".----": "1", "..---": "2", "...--": "3", "....-": "4", ".....": "5", "-....": "6", "--...": "7", "---..": "8", "----.": "9" };
  const MORSE_TERS = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
  function morseCoz(g) { if (!/^[.\-\s/]+$/.test(g.trim())) return null; const o = g.trim().split(/\s*\/\s*|\s{2,}/).map((w) => w.trim().split(/\s+/).map((k) => MORSE[k] || "").join("")).join(" "); return o.replace(/\s+/g, " ").trim() || null; }
  function morseKodla(g) { return g.toUpperCase().split("").map((c) => c === " " ? "/" : MORSE_TERS[c] || "").filter(Boolean).join(" "); }

  // Baconian (26 harf, A/B 5'li gruplar; 0/1 de kabul)
  function baconCoz(g) {
    let t = g.trim().toUpperCase().replace(/[^ABAB01]/g, "").replace(/0/g, "A").replace(/1/g, "B");
    if (t.length < 5 || t.length % 5) return null; let o = "";
    for (let i = 0; i < t.length; i += 5) { const n = parseInt(t.substr(i, 5).replace(/A/g, "0").replace(/B/g, "1"), 2); if (n > 25) return null; o += String.fromCharCode(65 + n); }
    return o || null;
  }
  function baconKodla(g) { return g.toUpperCase().replace(/[^A-Z]/g, "").split("").map((c) => (c.charCodeAt(0) - 65).toString(2).padStart(5, "0").replace(/0/g, "A").replace(/1/g, "B")).join(" "); }

  // A1Z26
  function a1z26Coz(g) { const p = g.trim().split(/[\s,.\-]+/).filter(Boolean); if (p.length < 1 || !p.every((x) => /^\d{1,2}$/.test(x) && +x >= 1 && +x <= 26)) return null; return p.map((x) => String.fromCharCode(96 + +x)).join(""); }
  function a1z26Kodla(g) { return g.toLowerCase().replace(/[^a-z]/g, "").split("").map((c) => c.charCodeAt(0) - 96).join("-"); }

  // NATO fonetik
  const NATO = { ALFA: "A", ALPHA: "A", BRAVO: "B", CHARLIE: "C", DELTA: "D", ECHO: "E", FOXTROT: "F", GOLF: "G", HOTEL: "H", INDIA: "I", JULIETT: "J", JULIET: "J", KILO: "K", LIMA: "L", MIKE: "M", NOVEMBER: "N", OSCAR: "O", PAPA: "P", QUEBEC: "Q", ROMEO: "R", SIERRA: "S", TANGO: "T", UNIFORM: "U", VICTOR: "V", WHISKEY: "W", XRAY: "X", "X-RAY": "X", YANKEE: "Y", ZULU: "Z" };
  const NATO_TERS = { A: "Alfa", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo", F: "Foxtrot", G: "Golf", H: "Hotel", I: "India", J: "Juliett", K: "Kilo", L: "Lima", M: "Mike", N: "November", O: "Oscar", P: "Papa", Q: "Quebec", R: "Romeo", S: "Sierra", T: "Tango", U: "Uniform", V: "Victor", W: "Whiskey", X: "Xray", Y: "Yankee", Z: "Zulu" };
  function natoCoz(g) { const p = g.trim().toUpperCase().split(/\s+/); if (p.length < 1 || !p.every((w) => NATO[w])) return null; return p.map((w) => NATO[w]).join(""); }
  function natoKodla(g) { return g.toUpperCase().replace(/[^A-Z]/g, "").split("").map((c) => NATO_TERS[c]).join(" "); }

  // Leetspeak
  function leetCoz(g) { if (!/[0134578@$!]/.test(g)) return null; const m = { "4": "a", "@": "a", "8": "b", "3": "e", "1": "i", "!": "i", "0": "o", "5": "s", "$": "s", "7": "t" }; const s = g.replace(/[4@83105$7!]/g, (c) => m[c] || c); return s === g ? null : s; }
  function leetKodla(g) { const m = { a: "4", b: "8", e: "3", i: "1", o: "0", s: "5", t: "7" }; return g.toLowerCase().replace(/[abeiost]/g, (c) => m[c]); }

  // Tap code (5x5, K yok)
  const TAP_ALF = "ABCDEFGHIJLMNOPQRSTUVWXYZ";
  function tapCoz(g) {
    // Yalnızca nokta/rakam/boşluk kabul: harf veya 5-üstü rakam varsa tap değil.
    if (!/^[.\d\s/]+$/.test(g.trim()) || /[6-9]/.test(g)) return null;
    const sayilar = (g.trim().match(/\.+|\d/g) || []).map((t) => t[0] === "." ? t.length : +t);
    if (sayilar.length < 2 || sayilar.length % 2 || sayilar.some((n) => n < 1 || n > 5)) return null;
    let o = ""; for (let i = 0; i < sayilar.length; i += 2) o += TAP_ALF[(sayilar[i] - 1) * 5 + (sayilar[i + 1] - 1)];
    return o || null;
  }
  function tapKodla(g) { return g.toUpperCase().replace(/K/g, "C").replace(/[^A-Z]/g, "").split("").map((c) => { const i = TAP_ALF.indexOf(c); if (i < 0) return ""; return ".".repeat(Math.floor(i / 5) + 1) + " " + ".".repeat((i % 5) + 1); }).filter(Boolean).join("  "); }

  // Polybius (5x5, I=J)
  const POLY_ALF = "ABCDEFGHIKLMNOPQRSTUVWXYZ";
  function polyCoz(g) {
    const d = g.trim().replace(/\s+/g, ""); if (d.length < 2 || d.length % 2 || !/^[1-5]+$/.test(d)) return null;
    let o = ""; for (let i = 0; i < d.length; i += 2) o += POLY_ALF[(+d[i] - 1) * 5 + (+d[i + 1] - 1)];
    return o || null;
  }
  function polyKodla(g) { return g.toUpperCase().replace(/J/g, "I").replace(/[^A-Z]/g, "").split("").map((c) => { const i = POLY_ALF.indexOf(c); return i < 0 ? "" : (Math.floor(i / 5) + 1).toString() + ((i % 5) + 1); }).filter(Boolean).join(" "); }

  // Reverse
  function reverseCoz(g) { return [...g].reverse().join(""); }

  // ===================== KLASİK ŞİFRELER =====================

  function caesarKaydir(g, k) { return g.replace(/[A-Za-z]/g, (c) => { const b = c <= "Z" ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - b + k + 26) % 26) + b); }); }
  // Brute klasik şifreler uzun girdide atlanır: hem pahalı (sayfada takılma) hem de
  // Caesar/Affine/Railfence metinleri CTF'de kısadır. Yapısal çözücüler sınırsız çalışır.
  const BRUTE_MAKS = 1024;
  function caesarCoz(g) { if (g.length > BRUTE_MAKS || !/[A-Za-z]/.test(g)) return null; const ad = []; for (let k = 1; k < 26; k++) ad.push({ cikti: caesarKaydir(g, -k), not: "kaydırma=" + k }); const e = enIyi(ad); return e && { cikti: e.cikti, not: e.not }; }
  function caesarCozAnahtar(g, a) { const k = parseInt(a, 10); if (isNaN(k)) return null; return { cikti: caesarKaydir(g, -k), not: "kaydırma=" + k }; }
  function caesarKodla(g, a) { return caesarKaydir(g, parseInt(a, 10) || 3); }
  // CTF yardımcısı: 25 kaydırmanın hepsini tek bakışta listele (göz taraması için).
  function caesarTumKaydirmalar(g) {
    if (!/[A-Za-z]/.test(g)) return null;
    let o = "";
    for (let k = 1; k < 26; k++) o += "ROT" + String(k).padStart(2, " ") + ": " + caesarKaydir(g, k) + "\n";
    return o.trimEnd();
  }

  function rot13Coz(g) { return /[A-Za-z]/.test(g) ? caesarKaydir(g, 13) : null; }
  function rot47(g) { return g.replace(/[!-~]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 33 + 47) % 94) + 33)); }
  function rot47Coz(g) { return /[!-~]/.test(g) ? rot47(g) : null; }

  function atbashT(g) { return g.replace(/[A-Za-z]/g, (c) => { const b = c <= "Z" ? 65 : 97; return String.fromCharCode(b + 25 - (c.charCodeAt(0) - b)); }); }
  function atbashCoz(g) { return /[A-Za-z]/.test(g) ? atbashT(g) : null; }

  function affineKodla(g, anahtar) { let [a, b] = (anahtar || "5,8").split(/[,\s]+/).map(Number); if (!a) a = 5; if (isNaN(b)) b = 8; return g.replace(/[A-Za-z]/g, (c) => { const base = c <= "Z" ? 65 : 97; return String.fromCharCode(((a * (c.charCodeAt(0) - base) + b) % 26) + base); }); }
  function affineCozTek(g, a, b) { const ai = modTers(a, 26); if (ai == null) return null; return g.replace(/[A-Za-z]/g, (ch) => { const base = ch <= "Z" ? 65 : 97; return String.fromCharCode(((ai * (ch.charCodeAt(0) - base - b + 260)) % 26) + base); }); }
  function affineCoz(g) {
    if (g.length > BRUTE_MAKS || !/[A-Za-z]/.test(g)) return null; const ad = []; const gecerliA = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
    for (const a of gecerliA) for (let b = 0; b < 26; b++) ad.push({ cikti: affineCozTek(g, a, b), not: "a=" + a + ", b=" + b });
    const e = enIyi(ad); return e && { cikti: e.cikti, not: e.not };
  }
  function affineCozAnahtar(g, anahtar) { const [a, b] = (anahtar || "").split(/[,\s]+/).map(Number); if (!a || isNaN(b)) return null; const c = affineCozTek(g, a, b); return c && { cikti: c, not: "a=" + a + ", b=" + b }; }

  function vigenere(g, anahtar, yon) {
    const k = (anahtar || "").replace(/[^A-Za-z]/g, "").toLowerCase(); if (!k) return null;
    let i = 0, degisti = false;
    const o = g.replace(/[A-Za-z]/g, (c) => { const base = c <= "Z" ? 65 : 97; const s = k.charCodeAt(i % k.length) - 97; i++; degisti = true; return String.fromCharCode(((c.charCodeAt(0) - base + yon * s + 26) % 26) + base); });
    return degisti ? o : null;
  }
  function vigenereCoz(g, a) { return vigenere(g, a, -1); }
  function vigenereKodla(g, a) { return vigenere(g, a, 1); }

  // Gronsfeld — Vigenère benzeri ama anahtar rakam dizisi (her rakam kaydırma).
  function gronsfeld(g, anahtar, yon) {
    const d = (anahtar || "").replace(/\D/g, ""); if (!d) return null;
    let i = 0, degisti = false;
    const o = g.replace(/[A-Za-z]/g, (c) => { const base = c <= "Z" ? 65 : 97; const s = +d[i % d.length]; i++; degisti = true; return String.fromCharCode(((c.charCodeAt(0) - base + yon * s + 26) % 26) + base); });
    return degisti ? o : null;
  }
  function gronsfeldCoz(g, a) { return gronsfeld(g, a, -1); }
  function gronsfeldKodla(g, a) { return gronsfeld(g, a, 1); }

  // Playfair — anahtar kelimeli 5×5 kare (I/J birleşik). Digraf (harf çifti) şifresi.
  function playfairKare(anahtar) {
    const a = (anahtar || "").toUpperCase().replace(/J/g, "I").replace(/[^A-Z]/g, "");
    const gorulen = new Set(); const kare = [];
    for (const c of a + "ABCDEFGHIKLMNOPQRSTUVWXYZ") if (!gorulen.has(c)) { gorulen.add(c); kare.push(c); }
    return kare; // 25 harf
  }
  function playfairCift(kare, a, b, yon) {
    const ia = kare.indexOf(a), ib = kare.indexOf(b);
    let ra = (ia / 5) | 0, ca = ia % 5, rb = (ib / 5) | 0, cb = ib % 5;
    if (ra === rb) { ca = (ca + yon + 5) % 5; cb = (cb + yon + 5) % 5; }
    else if (ca === cb) { ra = (ra + yon + 5) % 5; rb = (rb + yon + 5) % 5; }
    else { const t = ca; ca = cb; cb = t; }
    return kare[ra * 5 + ca] + kare[rb * 5 + cb];
  }
  function playfairKodla(g, anahtar) {
    const kare = playfairKare(anahtar); if (kare.length < 25) return null;
    let s = g.toUpperCase().replace(/J/g, "I").replace(/[^A-Z]/g, ""); if (!s) return null;
    let hazir = "";
    for (let i = 0; i < s.length;) { const a = s[i], b = s[i + 1]; if (!b || a === b) { hazir += a + "X"; i += 1; } else { hazir += a + b; i += 2; } }
    let o = ""; for (let i = 0; i < hazir.length; i += 2) o += playfairCift(kare, hazir[i], hazir[i + 1], 1);
    return o;
  }
  function playfairCoz(g, anahtar) {
    const kare = playfairKare(anahtar); if (kare.length < 25) return null;
    let s = g.toUpperCase().replace(/J/g, "I").replace(/[^A-Z]/g, ""); if (s.length < 2) return null;
    if (s.length % 2) s += "X";
    let o = ""; for (let i = 0; i < s.length; i += 2) o += playfairCift(kare, s[i], s[i + 1], -1);
    return o;
  }

  // Bifid — anahtarlı 5×5 kare (playfairKare) + koordinat fraksiyonlaması (periyot = tüm metin).
  function bifidKodla(g, anahtar) {
    const kare = playfairKare(anahtar); if (kare.length < 25) return null;
    const s = g.toUpperCase().replace(/J/g, "I").replace(/[^A-Z]/g, ""); if (!s) return null;
    const satir = [], sutun = [];
    for (const c of s) { const i = kare.indexOf(c); satir.push((i / 5) | 0); sutun.push(i % 5); }
    const seq = satir.concat(sutun);
    let o = ""; for (let k = 0; k < s.length; k++) o += kare[seq[2 * k] * 5 + seq[2 * k + 1]];
    return o;
  }
  function bifidCoz(g, anahtar) {
    const kare = playfairKare(anahtar); if (kare.length < 25) return null;
    const s = g.toUpperCase().replace(/J/g, "I").replace(/[^A-Z]/g, ""); if (s.length < 1) return null;
    const koord = []; for (const c of s) { const i = kare.indexOf(c); koord.push((i / 5) | 0, i % 5); }
    const n = s.length; const satir = koord.slice(0, n), sutun = koord.slice(n);
    let o = ""; for (let k = 0; k < n; k++) o += kare[satir[k] * 5 + sutun[k]];
    return o;
  }

  // Railfence
  function railKodla(g, raylar) {
    const r = Math.max(2, parseInt(raylar, 10) || 3); const satir = Array.from({ length: r }, () => []);
    let d = 1, s = 0; for (const c of g) { satir[s].push(c); if (s === 0) d = 1; else if (s === r - 1) d = -1; s += d; }
    return satir.map((x) => x.join("")).join("");
  }
  function railCozR(g, r) {
    const n = g.length; const desen = []; let d = 1, s = 0;
    for (let i = 0; i < n; i++) { desen.push(s); if (s === 0) d = 1; else if (s === r - 1) d = -1; s += d; }
    const sira = [...Array(n).keys()].sort((a, b) => desen[a] - desen[b] || a - b);
    const sonuc = new Array(n); for (let i = 0; i < n; i++) sonuc[sira[i]] = g[i]; return sonuc.join("");
  }
  function railCoz(g) { const t = g.trim(); if (t.length < 3 || t.length > BRUTE_MAKS || /\s/.test(t)) return null; const ad = []; for (let r = 2; r <= Math.min(12, t.length - 1); r++) ad.push({ cikti: railCozR(t, r), not: "ray=" + r }); const e = enIyi(ad); return e && { cikti: e.cikti, not: e.not }; }
  function railCozAnahtar(g, a) { const r = parseInt(a, 10); if (!r || r < 2) return null; return { cikti: railCozR(g.trim(), r), not: "ray=" + r }; }

  // XOR (anahtarlı; anahtarsız tek-bayt brute, hex girdi)
  function xorKodla(g, anahtar) { const k = metniBaytlar(anahtar || "key"); const b = metniBaytlar(g); return [...b].map((x, i) => (x ^ k[i % k.length]).toString(16).padStart(2, "0")).join(""); }
  function xorCozAnahtar(g, anahtar) {
    const k = metniBaytlar(anahtar); if (!k.length) return null;
    let bytes; const t = g.trim().replace(/\s+/g, "");
    if (/^[0-9a-fA-F]+$/.test(t) && t.length % 2 === 0) { bytes = []; for (let i = 0; i < t.length; i += 2) bytes.push(parseInt(t.substr(i, 2), 16)); }
    else bytes = [...metniBaytlar(g)];
    return baytlariMetne(bytes.map((x, i) => x ^ k[i % k.length]));
  }
  function xorBrute(g) {
    const t = g.trim().replace(/\s+/g, ""); if (!/^[0-9a-fA-F]+$/.test(t) || t.length % 2 || t.length < 4) return null;
    const bytes = []; for (let i = 0; i < t.length; i += 2) bytes.push(parseInt(t.substr(i, 2), 16));
    const ad = []; for (let k = 1; k < 256; k++) ad.push({ cikti: baytlariMetne(bytes.map((x) => x ^ k)), not: "anahtar=0x" + k.toString(16) }); const e = enIyi(ad); return e && { cikti: e.cikti, not: e.not };
  }

  // JWT (yalnızca çöz)
  function jwtCoz(g) {
    const p = g.trim().split("."); if (p.length !== 3) return null;
    const c = (b) => { const r = b64Coz(b); if (!r) return null; try { return JSON.stringify(JSON.parse(r), null, 2); } catch (_) { return r; } };
    const h = c(p[0]), pay = c(p[1]); if (!h || !pay) return null; return "// Header\n" + h + "\n\n// Payload\n" + pay;
  }

  // ===================== KAYIT =====================
  // yapisal: biçime uyma zorunluluğu olanlar güven bonusu alır.
  // anahtar: Kodla/Çöz için parametre/anahtar ipucu (null = gerekmez).
  const KAYIT = [
    { ad: "JWT (Header + Payload)", yapisal: true, bonus: 0.2, coz: jwtCoz },
    { ad: "Base64 / Base64URL", yapisal: true, coz: b64Coz, kodla: b64Kodla },
    { ad: "Base32", yapisal: true, coz: b32Coz, kodla: b32Kodla },
    { ad: "Base58", yapisal: true, coz: b58Coz, kodla: b58Kodla },
    { ad: "Base62", yapisal: true, coz: b62Coz, kodla: b62Kodla },
    { ad: "Base85 / Ascii85", yapisal: true, coz: b85Coz, kodla: b85Kodla },
    { ad: "Base45", yapisal: true, coz: b45Coz, kodla: b45Kodla },
    { ad: "basE91", yapisal: true, coz: b91Coz, kodla: b91Kodla },
    { ad: "Onaltılık (Hex)", yapisal: true, coz: hexCoz, kodla: hexKodla },
    { ad: "Sekizlik (Octal) ASCII", yapisal: true, coz: octCoz, kodla: octKodla },
    { ad: "Ondalık ASCII", yapisal: true, coz: decCoz, kodla: decKodla },
    { ad: "İkilik (Binary)", yapisal: true, coz: binCoz, kodla: binKodla },
    { ad: "URL (percent)", yapisal: true, coz: urlCoz, kodla: urlKodla },
    { ad: "HTML varlıkları", yapisal: true, coz: htmlCoz, kodla: htmlKodla },
    { ad: "Unicode kaçış (\\uXXXX)", yapisal: true, coz: uniCoz, kodla: uniKodla },
    { ad: "Quoted-Printable", yapisal: true, coz: qpCoz, kodla: qpKodla },
    { ad: "Morse", yapisal: true, coz: morseCoz, kodla: morseKodla },
    { ad: "Baconian", yapisal: true, coz: baconCoz, kodla: baconKodla },
    { ad: "Tap code", yapisal: true, coz: tapCoz, kodla: tapKodla },
    { ad: "A1Z26", yapisal: true, coz: a1z26Coz, kodla: a1z26Kodla },
    { ad: "NATO fonetik", yapisal: true, coz: natoCoz, kodla: natoKodla },
    { ad: "Leetspeak", yapisal: false, coz: leetCoz, kodla: leetKodla },
    { ad: "Polybius karesi", yapisal: true, coz: polyCoz, kodla: polyKodla },
    { ad: "Ters çevirme", yapisal: false, coz: reverseCoz, kodla: reverseCoz },
    { ad: "ROT13", yapisal: false, coz: rot13Coz, kodla: rot13Coz },
    { ad: "ROT47", yapisal: false, coz: rot47Coz, kodla: rot47Coz },
    { ad: "Atbash", yapisal: false, coz: atbashCoz, kodla: atbashT },
    { ad: "Caesar (kaydırma)", yapisal: false, coz: caesarCoz, cozAnahtar: caesarCozAnahtar, kodla: caesarKodla, anahtar: "kaydırma sayısı (ör. 3)" },
    { ad: "Caesar — tüm kaydırmalar", yapisal: false, kodla: caesarTumKaydirmalar },
    { ad: "Affine", yapisal: false, coz: affineCoz, cozAnahtar: affineCozAnahtar, kodla: affineKodla, anahtar: "a,b (ör. 5,8)" },
    { ad: "Vigenère", yapisal: false, cozAnahtar: vigenereCoz, kodla: vigenereKodla, anahtar: "anahtar kelime" },
    { ad: "Gronsfeld", yapisal: false, cozAnahtar: gronsfeldCoz, kodla: gronsfeldKodla, anahtar: "rakamlar (ör. 31415)" },
    { ad: "Playfair", yapisal: false, cozAnahtar: playfairCoz, kodla: playfairKodla, anahtar: "anahtar kelime" },
    { ad: "Bifid", yapisal: false, cozAnahtar: bifidCoz, kodla: bifidKodla, anahtar: "anahtar kelime" },
    { ad: "Railfence (zigzag)", yapisal: false, coz: railCoz, cozAnahtar: railCozAnahtar, kodla: railKodla, anahtar: "ray sayısı (ör. 3)" },
    { ad: "XOR", yapisal: false, cozAnahtar: xorCozAnahtar, cozBrute: xorBrute, kodla: xorKodla, anahtar: "anahtar (hex girdi önerilir)" }
  ];

  const ESIK = 0.3; // bu puanın altındaki çöp adaylar gizlenir

  // Otomatik tanıma + çöz. anahtar verilirse anahtar gerektiren yöntemler de dener.
  function coz(girdi, anahtar) {
    if (!girdi || !girdi.trim()) return [];
    const sonuc = [];
    const anahtarVar = anahtar && anahtar.trim();
    for (const y of KAYIT) {
      let r = null, anahtarKullanildi = false;
      try {
        // Anahtar verildiyse önce anahtarlı çözümü dene; o yöntem kesinleşir.
        if (anahtarVar && y.cozAnahtar) { r = y.cozAnahtar(girdi, anahtar.trim()); if (r) anahtarKullanildi = true; }
        if (!r && y.coz) r = y.coz(girdi);
        if (!r && !anahtarVar && y.cozBrute) r = y.cozBrute(girdi);
      } catch (_) { r = null; }
      if (!r) continue;
      const cikti = typeof r === "string" ? r : r.cikti; const not = typeof r === "string" ? "" : r.not;
      if (!cikti || cikti === girdi.trim()) continue;
      const puan = okunabilirlikPuani(cikti);   // gösterim için ham okunabilirlik (0..1)
      // Yapısal çözümün çıktısı temiz bir kodlamaysa (çok katlı CTF ara-katmanı).
      const araKatman = y.yapisal && yapiliMi(cikti);
      // Sıralama puanı ayrı ve tavansız: okunabilirlik yöntemler arası farkı korur.
      let sira = y.yapisal ? puan + (y.bonus || 0.12) : puan * 0.82;
      if (araKatman) sira += 0.45;   // çıktı temiz kodlama → çok katlıda güçlü sinyal
      // Kullanıcı anahtar verip o yöntem çalıştıysa güçlü öncelik (niyet sinyali).
      if (anahtarKullanildi) sira += 0.4;
      // Düşük okunabilirlik elenir — ama geçerli ara-katman ve anahtarlı çözüm korunur.
      if (puan < ESIK && !araKatman && !anahtarKullanildi) continue;
      sonuc.push({ yontem: y.ad + (not ? " — " + not : ""), cikti, puan, sira });
    }
    sonuc.sort((a, b) => b.sira - a.sira);
    return sonuc;
  }

  // Seçilen yöntemle kodla (encrypt/encode).
  function kodla(girdi, yontemAd, anahtar) {
    const y = KAYIT.find((x) => x.ad === yontemAd); if (!y || !y.kodla) return null;
    try { return y.kodla(girdi, anahtar); } catch (_) { return null; }
  }

  // Kodlanabilir yöntem listesi (dropdown için).
  function kodlaYontemleri() { return KAYIT.filter((y) => y.kodla).map((y) => ({ ad: y.ad, anahtar: y.anahtar || null })); }

  // Hash tanıma — hash'ler geri çözülemez, ama CTF'de türü sık sorulur.
  // Uzunluk + karakter deseni + öntakı ile olası türleri listeler.
  function hashTani(girdi) {
    const t = girdi.trim();
    if (!t || /\s/.test(t)) return [];
    const sonuc = [];
    const ekle = (tur, not) => sonuc.push({ tur, not: not || "" });

    // Öntakılı (crypt) formatlar — kesin.
    if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(t)) ekle("bcrypt", "$2a/2b/2y$");
    else if (/^\$argon2(id|i|d)\$/.test(t)) ekle("Argon2", t.match(/^\$argon2(id|i|d)/)[0].slice(1));
    else if (/^\$6\$/.test(t)) ekle("sha512crypt", "$6$");
    else if (/^\$5\$/.test(t)) ekle("sha256crypt", "$5$");
    else if (/^\$1\$/.test(t)) ekle("md5crypt", "$1$");
    else if (/^\{SSHA\}/.test(t)) ekle("LDAP SSHA", "salted SHA-1");
    else if (/^\{SHA\}/.test(t)) ekle("LDAP SHA", "");
    else if (/^[./A-Za-z0-9]{13}$/.test(t) && !/^[0-9a-fA-F]+$/.test(t)) ekle("DES crypt (traditional)", "13 karakter");

    // Saf hex — uzunluğa göre aday türler.
    if (/^[0-9a-fA-F]+$/.test(t)) {
      const n = t.length;
      const harita = {
        8: ["CRC-32", "Adler-32"],
        16: ["MySQL<4.1", "CRC-64"],
        32: ["MD5", "MD4", "NTLM", "RIPEMD-128", "MD2"],
        40: ["SHA-1", "RIPEMD-160", "MySQL4.1+ (SHA-1)"],
        56: ["SHA-224", "SHA3-224"],
        64: ["SHA-256", "SHA3-256", "BLAKE2s", "RIPEMD-256"],
        96: ["SHA-384", "SHA3-384"],
        128: ["SHA-512", "SHA3-512", "BLAKE2b", "Whirlpool"]
      };
      if (harita[n]) harita[n].forEach((x) => ekle(x, n + " hex hane"));
    }
    return sonuc;
  }

  // Shannon entropisi (bit/karakter). CTF ipucu: ~4 hex, ~4.5-5 base64,
  // ~7.9+ şifreli/sıkıştırılmış/rastgele, düşük (<3.5) düz metin olabilir.
  function entropi(girdi) {
    const s = girdi || "";
    const n = s.length;
    if (n === 0) return 0;
    const say = {};
    for (const ch of s) say[ch] = (say[ch] || 0) + 1;
    let h = 0;
    for (const k in say) { const p = say[k] / n; h -= p * Math.log2(p); }
    return h;
  }

  const api = { coz, kodla, kodlaYontemleri, okunabilirlikPuani, vigenereCoz, hashTani, entropi };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.Cozucu = api;
})(typeof self !== "undefined" ? self : this);
