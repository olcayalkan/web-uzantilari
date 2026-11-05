// Popup: iki mod — "Çöz" (otomatik tanıma + decrypt) ve "Kodla" (seçili yöntemle encrypt).

const girdiEl = document.getElementById("girdi");
const anahtarEl = document.getElementById("anahtar");
const anahtarSatir = document.getElementById("anahtarSatir");
const yontemEl = document.getElementById("yontem");
const durumEl = document.getElementById("durum");
const sonuclarEl = document.getElementById("sonuclar");
const panoBtn = document.getElementById("panoBtn");
const modCozBtn = document.getElementById("modCoz");
const modKodlaBtn = document.getElementById("modKodla");

let mod = "coz"; // "coz" | "kodla"
let zamanlayici = null;

// Kodla yöntemlerini dropdown'a doldur (her açılışta bir kez).
Cozucu.kodlaYontemleri().forEach(({ ad }) => {
  const o = document.createElement("option");
  o.value = ad;
  o.textContent = ad;
  yontemEl.append(o);
});

function secili() {
  return Cozucu.kodlaYontemleri().find((y) => y.ad === yontemEl.value);
}

// Seçili yönteme göre anahtar alanının ipucunu/görünürlüğünü ayarla.
function anahtarAyarla() {
  if (mod === "kodla") {
    const y = secili();
    anahtarSatir.hidden = !(y && y.anahtar);
    if (y && y.anahtar) anahtarEl.placeholder = y.anahtar;
  } else {
    anahtarSatir.hidden = false;
    anahtarEl.placeholder = "Anahtar / parametre (opsiyonel — Vigenère, XOR, Caesar...)";
  }
}

function kart(yontem, cikti, rozetMetni, ilk) {
  const k = document.createElement("div");
  k.className = "kart" + (ilk ? " ilk" : "");
  const baslik = document.createElement("div");
  baslik.className = "kart-baslik";
  const ad = document.createElement("span");
  ad.className = "yontem";
  ad.textContent = (ilk ? "✓ " : "") + yontem;
  const rozet = document.createElement("div");
  rozet.className = "rozet";
  if (rozetMetni) {
    const p = document.createElement("span");
    p.textContent = rozetMetni;
    rozet.append(p);
  }
  const kopyala = document.createElement("button");
  kopyala.className = "kopyala";
  kopyala.textContent = "Kopyala";
  kopyala.addEventListener("click", () => {
    navigator.clipboard.writeText(cikti).then(() => {
      kopyala.textContent = "✓";
      setTimeout(() => (kopyala.textContent = "Kopyala"), 1200);
    });
  });
  rozet.append(kopyala);
  baslik.append(ad, rozet);
  const pre = document.createElement("pre");
  pre.className = "cikti";
  pre.textContent = cikti;
  k.append(baslik, pre);
  return k;
}

function cizdir() {
  sonuclarEl.innerHTML = "";
  const girdi = girdiEl.value;
  const anahtar = anahtarEl.value.trim();

  if (!girdi.trim()) {
    durumEl.textContent = "";
    return;
  }

  if (mod === "coz") {
    // Girdi hash'e benziyorsa bilgi kartı (hash geri çözülemez).
    const hashlar = Cozucu.hashTani(girdi);
    if (hashlar.length) {
      const h = document.createElement("div");
      h.className = "kart hash";
      const b = document.createElement("div");
      b.className = "kart-baslik";
      const ad = document.createElement("span");
      ad.className = "yontem";
      ad.textContent = "⚠ Hash olabilir (geri çözülemez)";
      b.append(ad);
      const p = document.createElement("div");
      p.className = "cikti";
      p.textContent = "Olası tür: " + hashlar.map((x) => x.tur).join(", ") +
        "\n(" + hashlar[0].not + ") — kırmak için sözlük/rainbow saldırısı gerekir.";
      h.append(b, p);
      sonuclarEl.append(h);
    }

    const liste = Cozucu.coz(girdi, anahtar);
    if (liste.length === 0) {
      durumEl.textContent = hashlar.length ? "Çözülebilir kodlama yok (yukarıdaki hash bilgisine bak)." : "Tanınan bir kodlama bulunamadı.";
      return;
    }
    const ent = Cozucu.entropi(girdi.trim()).toFixed(1);
    durumEl.textContent = liste.length + " olası çözüm · entropi " + ent + " bit — en olası: " + liste[0].yontem;
    const yap = (s, i) => kart(s.yontem, s.cikti, Math.round(s.puan * 100) + "% okunabilir", i === 0);
    const ESIK = 3; // ilk 3'ü göster, gerisini katla (gürültüyü azalt)
    liste.slice(0, ESIK).forEach((s, i) => sonuclarEl.append(yap(s, i)));
    if (liste.length > ESIK) {
      const dugme = document.createElement("button");
      dugme.className = "dahaFazla";
      dugme.textContent = "＋ " + (liste.length - ESIK) + " aday daha göster";
      dugme.addEventListener("click", () => {
        dugme.remove();
        liste.slice(ESIK).forEach((s, i) => sonuclarEl.append(yap(s, i + ESIK)));
      });
      sonuclarEl.append(dugme);
    }
  } else {
    const y = secili();
    const cikti = Cozucu.kodla(girdi, yontemEl.value, anahtar);
    if (cikti == null) {
      durumEl.textContent =
        y && y.anahtar && !anahtar ? "Bu yöntem anahtar gerektiriyor: " + y.anahtar : "Kodlanamadı.";
      return;
    }
    durumEl.textContent = yontemEl.value + " ile kodlandı.";
    sonuclarEl.append(kart(yontemEl.value, cikti, null, true));
  }
}

function gecikmeliCiz() {
  clearTimeout(zamanlayici);
  zamanlayici = setTimeout(cizdir, 150);
}

// Son mod ve seçili yöntemi hatırla — data katmanı (Depolama) üzerinden.
function tercihKaydet() {
  Depolama.tercihKaydet(mod, yontemEl.value);
}

function modDegistir(yeni, kaydet = true) {
  mod = yeni;
  modCozBtn.classList.toggle("aktif", mod === "coz");
  modKodlaBtn.classList.toggle("aktif", mod === "kodla");
  yontemEl.hidden = mod !== "kodla";
  anahtarAyarla();
  if (kaydet) tercihKaydet();
  cizdir();
}

modCozBtn.addEventListener("click", () => modDegistir("coz"));
modKodlaBtn.addEventListener("click", () => modDegistir("kodla"));
yontemEl.addEventListener("change", () => {
  anahtarAyarla();
  tercihKaydet();
  cizdir();
});
girdiEl.addEventListener("input", gecikmeliCiz);
anahtarEl.addEventListener("input", gecikmeliCiz);

panoBtn.addEventListener("click", async () => {
  try {
    girdiEl.value = await navigator.clipboard.readText();
    cizdir();
  } catch (_) {
    durumEl.textContent = "Panoya erişilemedi (izin gerekebilir).";
  }
});

// Sağ tık menüsünden gelen seçim varsa yükle (Çöz modu).
Depolama.secimYukle((secim) => {
  if (secim) {
    girdiEl.value = secim;
    Depolama.secimTemizle();
    cizdir();
  }
});

// Son tercihi geri yükle (yoksa Çöz modunda kal).
Depolama.tercihleriYukle((d) => {
  if (d && d.sonYontem) yontemEl.value = d.sonYontem;
  if (d && d.sonMod === "kodla") modDegistir("kodla", false);
  else anahtarAyarla();
});

// Sayfa-içi otomatik çözme anahtarı; rozeti service worker depodaki değişiklikten günceller.
const acikEl = document.getElementById("acik");
Depolama.acikYukle((v) => { acikEl.checked = v; });
acikEl.addEventListener("change", () => Depolama.acikKaydet(acikEl.checked));

anahtarAyarla();
girdiEl.focus();
