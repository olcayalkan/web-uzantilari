// Domain test paketi — `node tests/test.js`. Tarayıcı gerektirmez.
// Sayfadaki gerçek davranış: `tests/calistir.sh` (görünmez Chrome).
const M = require("../src/features/itele/domain/itele_motoru.js");

let gecti = 0, kaldi = 0;
function ok(ad, kosul, detay) {
  if (kosul) gecti++;
  else { kaldi++; console.log("  ✗ " + ad + (detay ? " — " + detay : "")); }
}
const kutu = (left, width) => ({ left, width, right: left + width });

console.log("1) Kök stil");
ok("%70 genişlik", M.kokCss(0.7).includes("width:70vw!important"), M.kokCss(0.7));

console.log("2) Fixed öğe yerleşimi (1000px pencere, %70)");
ok("sınır içindeki öğeye dokunulmaz", M.fixedYerlesim(kutu(10, 200), 1000, 0.7, 10) === null);
ok("genişliği olmayan öğeye dokunulmaz", M.fixedYerlesim(kutu(900, 0), 1000, 0.7, 900) === null);
const ust = M.fixedYerlesim(kutu(0, 1000), 1000, 0.7, 0);
ok("tam genişlik şerit sınıra daralır", ust.left === "0px" && ust.width === "700px", JSON.stringify(ust));
const sohbet = M.fixedYerlesim(kutu(860, 120), 1000, 0.7, NaN);
ok("sağa dayalı öğe sağ boşluğunu korur", sohbet.left === "560px" && !("width" in sohbet), JSON.stringify(sohbet));
const pencere = M.fixedYerlesim(kutu(300, 400), 1000, 0.7, 500);
ok("ortalanmış öğe sol alanın ortasına", pencere.left === "350px", JSON.stringify(pencere)); // css left 500 + (150 - 300)
const solTasan = M.fixedYerlesim(kutu(50, 800), 1000, 0.7, 50);
ok("sola dayalı taşan öğe kırpılır", solTasan.left === "50px" && solTasan.width === "650px", JSON.stringify(solTasan));

console.log("\n" + gecti + " geçti, " + kaldi + " kaldı");
process.exit(kaldi ? 1 : 0);
