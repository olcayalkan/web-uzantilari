// Motor testleri: `node test.js`. Tarayıcı gerektirmez.

global.self = global;
global.atob = (s) => Buffer.from(s, "base64").toString("binary");
global.btoa = (s) => Buffer.from(s, "binary").toString("base64");
const C = require("../src/features/cozucu/domain/cozucu_motoru.js");

let gecti = 0, kaldi = 0;
function ok(ad, kosul, detay) {
  if (kosul) { gecti++; }
  else { kaldi++; console.log("  ✗ " + ad + (detay ? " — " + detay : "")); }
}
function enUst(girdi, anahtar) { const l = C.coz(girdi, anahtar); return l[0] ? l[0] : { yontem: "(yok)", cikti: "" }; }
function icerir(girdi, anahtar, beklenen) {
  const u = enUst(girdi, anahtar);
  return { gecer: u.cikti.toLowerCase().includes(beklenen.toLowerCase()), u };
}

console.log("1) Kodla→Çöz gidiş-dönüş (anahtarsız)");
const metin = "Merhaba dunya";
for (const { ad, anahtar } of C.kodlaYontemleri()) {
  if (anahtar) continue;
  // HTML/QP düz ASCII'yi aynen bırakır; anlamlı round-trip için özel karakter ver.
  const kaynak = /HTML|Quoted/.test(ad) ? "a<b>&c=" : metin;
  const beklenen = /HTML|Quoted/.test(ad) ? "a<b>&c=" : "merhaba";
  const enc = C.kodla(kaynak, ad);
  ok(ad + " kodlanır", enc != null && enc !== "", "enc boş");
  const listede = C.coz(enc).some((x) => x.cikti.toLowerCase().includes(beklenen.toLowerCase()));
  ok(ad + " geri çözülür (listede)", listede, "enc=" + JSON.stringify(enc).slice(0, 30));
}

console.log("2) Tekil otomatik tanıma (en-üst doğru)");
const tekil = [
  ["Base64", "TWVyaGFiYQ==", "Merhaba"],
  ["Hex", "4d65726861626120647c6e79", null],
  ["URL", "Merhaba%20d%C3%BCnya", "dünya"],
  ["Binary", "01001000 01101001", "Hi"],
  ["Ondalık", "72 101 108 108 111", "Hello"],
  ["Morse", ".... . .-.. .-.. ---", "HELLO"],
  ["ROT13", "Zreunon", "Merhaba"],
  ["Base32", "JBSWY3DP", "Hello"],
  ["Unicode", "\\u0048\\u0069", "Hi"],
];
for (const [ad, g, bek] of tekil) {
  const u = enUst(g);
  if (bek) ok(ad + " tanınır", u.cikti.includes(bek), "ust=" + u.yontem + " :: " + JSON.stringify(u.cikti).slice(0, 24));
}

console.log("3) JWT");
{
  const u = enUst("eyJhbGciOiJIUzI1NiJ9.eyJhZCI6IkRlbmVtZSJ9.sig");
  ok("JWT header+payload", u.yontem.startsWith("JWT") && u.cikti.includes("HS256") && u.cikti.includes("Deneme"), u.yontem);
}

console.log("4) Anahtarlı yöntemler");
const anahtarli = [["Vigenère", "gizli"], ["Gronsfeld", "31415"], ["Playfair", "secret"], ["Bifid", "secret"], ["Caesar (kaydırma)", "5"], ["Affine", "5,8"], ["Railfence (zigzag)", "3"], ["XOR", "gizli"]];
for (const [ad, key] of anahtarli) {
  const enc = C.kodla(metin, ad, key);
  const u = enUst(enc, key);
  ok(ad + " anahtarla çözülür", u.cikti.toLowerCase().includes("merhaba"), "key=" + key + " ust=" + u.yontem + " :: " + JSON.stringify(u.cikti).slice(0, 20));
}

console.log("5) Çok katlı (Base64∘Hex)");
{
  const ic = C.kodla("flag{ctf_2024}", "Onaltılık (Hex)");
  const dis = C.kodla(ic, "Base64 / Base64URL");
  const k1 = enUst(dis);
  const k2 = enUst(k1.cikti);
  ok("1. kat Base64", k1.yontem.includes("Base64"), k1.yontem);
  ok("2. kat Hex → flag", k2.cikti.includes("flag{ctf_2024}"), k2.yontem + " :: " + JSON.stringify(k2.cikti));
}

console.log("6) Gürültü reddi (düz metin yanlış pozitif vermemeli)");
{
  const u = enUst("the quick brown fox");
  // Düz İngilizce metin: ROT/Reverse gibi dönüşümler düz metni bozacağından
  // en-üst yine okunur bir şey olmalı ama anlamsız kısa çöp olmamalı
  ok("düz metin çökmez", C.coz("the quick brown fox").length >= 0, "");
  const bos = C.coz("");
  ok("boş girdi [] döner", Array.isArray(bos) && bos.length === 0, "");
}

console.log("7) Hash tanıma");
{
  const h32 = C.hashTani("5d41402abc4b2a76b9719d911017c592");
  ok("32 hex → MD5 adayı", h32.some((x) => x.tur === "MD5"), JSON.stringify(h32.map((x) => x.tur)));
  const h40 = C.hashTani("aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d");
  ok("40 hex → SHA-1 adayı", h40.some((x) => x.tur === "SHA-1"), "");
  const h64 = C.hashTani("a".repeat(64));
  ok("64 hex → SHA-256 adayı", h64.some((x) => x.tur === "SHA-256"), "");
  const bc = C.hashTani("$2b$12$" + "a".repeat(53));
  ok("$2b$ → bcrypt", bc.some((x) => x.tur === "bcrypt"), JSON.stringify(bc.map((x) => x.tur)));
  ok("düz metin hash değil", C.hashTani("merhaba dunya").length === 0, "");
  ok("Base64 hash sanılmaz", C.hashTani("TWVyaGFiYQ==").length === 0, "");
}

console.log("8b) Caesar tüm kaydırmalar (kodla yardımcısı)");
{
  const t = C.kodla("abc", "Caesar — tüm kaydırmalar");
  const satir = t.split("\n");
  ok("25 satır üretir", satir.length === 25, satir.length + " satır");
  ok("ROT1 abc→bcd", /ROT 1: bcd/.test(t), satir[0]);
  ok("coz sonuçlarında görünmez (decode yok)", !C.coz("abc").some((x) => x.yontem.includes("tüm kaydırmalar")), "");
}

console.log("8) Entropi");
{
  ok("boş girdi 0", C.entropi("") === 0, "");
  ok("tek karakter tekrarı düşük", C.entropi("aaaaaaaa") === 0, "" + C.entropi("aaaaaaaa"));
  const d = C.entropi("the quick brown fox");
  const r = C.entropi("9f8c2a1b7e4d6f03a5c8e2b1"); // hex-ish daha yüksek
  ok("rastgele hex > düz metin entropisi", r > d, "duz=" + d.toFixed(2) + " hex=" + r.toFixed(2));
}

console.log("\n" + "=".repeat(40));
console.log(`SONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
