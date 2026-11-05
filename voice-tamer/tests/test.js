// Domain test paketi — `node tests/test.js`. Tarayıcı ve ses donanımı gerektirmez.
// DSP davranışı (filtre tepkileri, canlı zincir) tarayıcıda: `node tests/calistir.mjs`.
const S = require("../src/core/sabitler.js");
const A = require("../src/features/ses/domain/ayarlar.js");
const K = require("../src/features/ses/domain/kararlar.js");

let gecti = 0, kaldi = 0;
function ok(ad, kosul, detay) {
  if (kosul) gecti++;
  else { kaldi++; console.log("  ✗ " + ad + (detay ? " — " + detay : "")); }
}

console.log("1) Ayar doğrulama");
const v = A.dogrula(null);
ok("boş girdi varsayılan", S.KEYS.every((k) => v[k] === S.SPEC[k].def) && v.on === true);
const kotu = A.dogrula(JSON.parse('{"output":9999,"deessMax":-500,"deessFreq":"abc","comp":1e9,"__proto__":{"kirli":true},"evilKey":"x","on":"evet"}'));
ok("üst sınıra kırpılır", kotu.output === 3 && kotu.comp === 1);
ok("alt sınıra kırpılır", kotu.deessMax === 0);
ok("sayı olmayan değer varsayılanda kalır", kotu.deessFreq === 7000);
ok("bilinmeyen anahtar alınmaz", !("evilKey" in kotu));
ok("prototype pollution yok", ({}).kirli === undefined && kotu.kirli === undefined);
ok("boolean olmayan 'on' yok sayılır", kotu.on === true);
ok("dizi girdi reddedilir", A.dogrula([1, 2]).output === S.SPEC.output.def);
ok("dışa aktarım yalnız şema alanları", Object.keys(A.disaAktar({ ...v, fazla: 1 })).length === S.KEYS.length + 1);

console.log("2) Kararlar");
const ayar = A.dogrula(null);
const D = K.olustur(ayar);
ok("%80 gırtlak = -13.98 dB", Math.abs(D.throatDb() + 13.979) < 0.01, D.throatDb());
ok("normal seste gırtlak eki yok", D.throatCutFor(0.65, 1) === 0);
ok("gırtlaklı seste ek devrede", D.throatCutFor(0.87, 1) < -5);
ok("AGC kısık bölümü yükseltmez", D.agcFor(0.012) === 1);
ok("AGC bağırmayı kısar", D.agcFor(0.3) < 0.7);
ok("AGC en fazla 3x kısar", D.agcFor(1e6) >= 1 / 3 - 1e-9);
ok("patlamada kesim", D.burstCutFor(0.145, 0.048) <= -11);
ok("normal konuşmada patlama kesimi yok", D.burstCutFor(0.05, 0.048) === 0);
ok("dengeleyici çukuru doldurmaz", D.evenCutFor(0.02, 0.05) === 0);
ok("dengeleyici derinlik tavanı", D.evenCutFor(1, 0.001) === -ayar.evenDepth * ayar.evenAmt);
ayar.deessMax = 0;
ok("kararlar canlı ayarı izler", D.cutFor(1, 1) === -0);
ok("hazır ayarlar şema sınırında", Object.values(S.PRESETS).every((p) => Object.entries(p).every(([k, x]) => x >= S.SPEC[k].min && x <= S.SPEC[k].max)));

console.log("\n" + gecti + " geçti, " + kaldi + " kaldı");
process.exit(kaldi ? 1 : 0);
