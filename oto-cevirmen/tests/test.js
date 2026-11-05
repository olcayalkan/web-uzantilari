// Motor testleri: `node test.js`. Tarayıcı gerektirmez.
// `node test.js --ag` ayrıca gerçek Google uç noktasını dener (internet gerekir).

global.self = global;
const S = require("../src/core/sabitler.js");
const M = require("../src/features/ceviri/domain/ceviri_motoru.js");

let gecti = 0, kaldi = 0;
function ok(ad, kosul, detay) {
  if (kosul) gecti++;
  else { kaldi++; console.log("  ✗ " + ad + (detay ? " — " + detay : "")); }
}

console.log("1) uygunMu — balon ne zaman açılmalı");
for (const m of ["Hello", "How are you?", "Привет", "日本語", "ok"]) ok("uygun: " + m, M.uygunMu(m));
for (const m of ["", "   ", "a", "12345", "3.14 + 2", "→ ← !!", "https://example.com/a?b=1",
  "www.ornek.com", "ali@ornek.com", "x".repeat(S.MAKS_GIRDI + 1), null, 42]) {
  ok("uygun değil: " + JSON.stringify(m).slice(0, 30), !M.uygunMu(m));
}

console.log("2) parcala — uzun metin bölme");
const kisa = "Kısa metin.";
ok("kısa metin tek parça", M.parcala(kisa, 100).length === 1);
const uzun = Array.from({ length: 200 }, (_, i) => "Sentence number " + i + ".").join(" ");
const p = M.parcala(uzun, 300);
ok("parçalar birleşince aynı metin", p.join("") === uzun);
ok("hiçbir parça sınırı aşmıyor", p.every((x) => x.length <= 300), p.map((x) => x.length).join(","));
ok("cümle sonundan bölünüyor", p.slice(0, -1).every((x) => x.endsWith(". ")), JSON.stringify(p[0].slice(-5)));
const tekKelime = "a".repeat(1000);
const pk = M.parcala(tekKelime, 300);
ok("boşluksuz metin de bölünüyor", pk.join("") === tekKelime && pk.every((x) => x.length <= 300));
const satirli = ("line one\nline two\n").repeat(40);
ok("satır sonundan bölünüyor", M.parcala(satirli, 100).slice(0, -1).every((x) => x.endsWith("\n")));

console.log("3) istekUrl");
const url = new URL(M.istekUrl("a & b ?ç", "tr"));
ok("host doğru", url.host === "translate.googleapis.com");
ok("sorgu kodlanmış", url.searchParams.get("q") === "a & b ?ç");
ok("hedef tr, kaynak auto", url.searchParams.get("tl") === "tr" && url.searchParams.get("sl") === "auto");

console.log("4) yanitCoz");
const ornek = [[["Selam Dünya. ", "Hello world. ", null, null, 10], ["Nasılsın?", "How are you?", null, null, 10]], null, "en"];
const r = M.yanitCoz(ornek);
ok("segmentler birleşir", r.ceviri === "Selam Dünya. Nasılsın?", r.ceviri);
ok("kaynak dil okunur", r.kaynakDil === "en");
const harfCevirili = [[["Merhaba", "Привет"], [null, null, "Merhaba", "Privet"]], null, "ru"];
ok("null segment atlanır", M.yanitCoz(harfCevirili).ceviri === "Merhaba");
let firladi = false;
try { M.yanitCoz({ hata: 1 }); } catch (_) { firladi = true; }
ok("bozuk yanıt hata fırlatır", firladi);

console.log("5) gereksizMi / dilAdi");
ok("Türkçe kaynak gereksiz", M.gereksizMi({ ceviri: "x", kaynakDil: "tr" }, "y"));
ok("çeviri = girdi gereksiz", M.gereksizMi({ ceviri: "iPhone", kaynakDil: "en" }, "iphone"));
ok("gerçek çeviri gerekli", !M.gereksizMi({ ceviri: "Merhaba", kaynakDil: "en" }, "Hello"));
ok("dilAdi en", M.dilAdi("en") === "İngilizce", M.dilAdi("en"));
ok("dilAdi boş", M.dilAdi("") === "Bilinmeyen dil");
ok("dilAdi bozuk kod çökmez", typeof M.dilAdi("??") === "string");

async function agTesti() {
  console.log("6) Gerçek uç nokta");
  const yan = await fetch(M.istekUrl("Good morning, my friend."));
  ok("HTTP 200", yan.ok, "HTTP " + yan.status);
  const s = M.yanitCoz(await yan.json());
  ok("kaynak en", s.kaynakDil === "en", s.kaynakDil);
  ok("Türkçe çeviri geldi", /günaydın/i.test(s.ceviri), s.ceviri);
  console.log("   → " + s.ceviri);
}

(async () => {
  if (process.argv.includes("--ag")) await agTesti();
  console.log("\n" + gecti + " geçti, " + kaldi + " kaldı");
  process.exit(kaldi ? 1 : 0);
})();
