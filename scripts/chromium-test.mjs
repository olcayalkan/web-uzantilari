// Uzantıların Chromium paketlerini gerçek, görünmez tarayıcıya kurup dener (DevTools protokolü,
// bağımlılıksız). Bulunan her tarayıcıda koşar: Chrome, Chromium, Brave, Edge. Fareyle seçim gerçek
// olaylarla yapılır. Kapalı Shadow DOM sayfadan okunamadığı için paketin deneme kopyasında açık
// kurulur. CHROMIUM_TARAYICILAR değişkeni iki nokta üst üste ile ayrılmış yol listesi alır.
// Kullanım: node scripts/chromium-test.mjs <dist klasörü>
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, delimiter, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const DIST = resolve(process.argv[2] || "dist");
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

function tarayicilar() {
  if (process.env.CHROMIUM_TARAYICILAR) return process.env.CHROMIUM_TARAYICILAR.split(delimiter).filter(existsSync);
  const yollar = (process.env.PATH || "").split(delimiter).filter(Boolean);
  const pf = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]].filter(Boolean);
  const gruplar = [
    ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ...pf.map((k) => join(k, "Google", "Chrome", "Application", "chrome.exe")), ...["google-chrome-stable", "google-chrome"].flatMap((a) => yollar.map((y) => join(y, a)))],
    ["/Applications/Chromium.app/Contents/MacOS/Chromium", ...["chromium", "chromium-browser"].flatMap((a) => yollar.map((y) => join(y, a)))],
    ["/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", ...pf.map((k) => join(k, "BraveSoftware", "Brave-Browser", "Application", "brave.exe")), ...["brave-browser", "brave"].flatMap((a) => yollar.map((y) => join(y, a)))],
    ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", ...pf.map((k) => join(k, "Microsoft", "Edge", "Application", "msedge.exe")), ...["microsoft-edge-stable", "microsoft-edge"].flatMap((a) => yollar.map((y) => join(y, a)))],
  ];
  return gruplar.map((g) => g.find(existsSync)).filter(Boolean);
}

const sunucu = createServer((_i, y) => y.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(
  `<!doctype html><title>t</title><body style="margin:0;font:40px sans-serif"><p id="m" style="margin:100px 20px">Good morning my dear friend</p>
   <p id="k" style="margin:100px 20px">TWVyaGFiYQ==</p><div id="f" style="position:fixed;right:0;bottom:0;width:100px;height:40px"></div></body>`
)).listen(0, "127.0.0.1");
await new Promise((r) => sunucu.once("listening", r));
const SAYFA = `http://127.0.0.1:${sunucu.address().port}/`;

function pakettenKlasor(kok, ad, degisiklik = {}) {
  const klasor = join(kok, "paket-" + ad);
  if (spawnSync("unzip", ["-q", join(DIST, `${ad}.zip`), "-d", klasor]).status !== 0) throw new Error("zip açılamadı: " + ad);
  for (const [dosya, [eski, yeni]] of Object.entries(degisiklik)) {
    const yol = join(klasor, dosya);
    const metin = readFileSync(yol, "utf8");
    if (!metin.includes(eski)) throw new Error(`${dosya} içinde yok: ${eski}`);
    writeFileSync(yol, metin.replace(eski, yeni));
  }
  return klasor;
}

// Tarayıcı başına ayrı profil: uzantılar birbirinin sonucunu etkilemesin.
async function dene(yol, ad, degisiklik, sina) {
  const kok = mkdtempSync(join(tmpdir(), "cr-test-"));
  const t = spawn(yol, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-pipe",
    "--enable-unsafe-extension-debugging", `--user-data-dir=${join(kok, "profil")}`, "about:blank"], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });
  const yaz = t.stdio[3], oku = t.stdio[4];
  let tampon = ""; let no = 0; const bekleyen = new Map();
  oku.setEncoding("utf8");
  oku.on("data", (p) => {
    tampon += p;
    let i;
    while ((i = tampon.indexOf("\0")) >= 0) {
      const d = JSON.parse(tampon.slice(0, i)); tampon = tampon.slice(i + 1);
      if (d.id && bekleyen.has(d.id)) { bekleyen.get(d.id)(d); bekleyen.delete(d.id); }
    }
  });
  const cdp = async (method, params = {}, sessionId) => {
    const d = await new Promise((r) => { bekleyen.set(++no, r); yaz.write(JSON.stringify({ id: no, method, params, ...(sessionId ? { sessionId } : {}) }) + "\0"); });
    if (d.error) throw new Error(`${method}: ${d.error.message}`);
    return d.result;
  };
  try {
    await cdp("Extensions.loadUnpacked", { path: pakettenKlasor(kok, ad, degisiklik) });
    const { targetId } = await cdp("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp("Target.attachToTarget", { targetId, flatten: true });
    await cdp("Page.enable", {}, sessionId);
    const degerlendir = async (ifade) => (await cdp("Runtime.evaluate", { expression: ifade, returnByValue: true, awaitPromise: true }, sessionId)).result.value;
    const git = async (url) => { await cdp("Page.navigate", { url }, sessionId); await bekle(1200); };
    const bekleDogru = async (ifade, ms = 8000) => {
      const son = Date.now() + ms;
      while (Date.now() < son) { if (await degerlendir(ifade)) return true; await bekle(150); }
      return false;
    };
    const surukle = async (x1, y, x2) => {
      const fare = (type, x, ek = {}) => cdp("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1, ...ek }, sessionId);
      await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: x1, y }, sessionId);
      await fare("mousePressed", x1);
      for (let x = x1; x < x2; x += 40) await fare("mouseMoved", x);
      await fare("mouseReleased", x2);
    };
    const olc = (id) => degerlendir(`(() => { const r = document.getElementById(${JSON.stringify(id)}).getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top + r.height / 2) }; })()`);
    return await sina({ git, degerlendir, bekleDogru, surukle, olc });
  } finally {
    t.kill();
    await bekle(400);
    rmSync(kok, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
}

const liste = tarayicilar();
if (!liste.length) { console.log("Chromium tarayıcısı bulunamadı, atlandı"); sunucu.close(); process.exit(0); }

const hatalar = []; let sayac = 0;
for (const yol of liste) {
  const ad = basename(yol);
  const ok = (a, k, d) => { sayac++; if (!k) hatalar.push(`${ad}: ${a}${d ? ` (${d})` : ""}`); };
  try {
    await dene(yol, "oto-cevirmen", { "src/features/ceviri/presentation/content/content.js": ['mode: "closed"', 'mode: "open"'] }, async (s) => {
      await s.git(SAYFA);
      const m = await s.olc("m");
      await s.surukle(m.x + 2, m.y, m.x + 400);
      const v = await s.bekleDogru(`document.querySelector("ceviri-balonu")?.shadowRoot.querySelector(".ust .dil")?.textContent.includes("→ Türkçe")`);
      ok("Oto Çevirmen: seçimde çeviri balonda görünür", v, await s.degerlendir(`document.querySelector("ceviri-balonu")?.shadowRoot.querySelector(".balon")?.textContent ?? "balon yok"`));
    });
    await dene(yol, "oto-cozucu", {}, async (s) => {
      await s.git(SAYFA);
      const k = await s.olc("k");
      await s.surukle(k.x + 1, k.y, k.x + 500);
      ok("Oto Çözücü: seçimde balon açılır", await s.bekleDogru(`document.querySelector("[data-cozucu]")?.textContent.includes("Merhaba")`));
    });
    await dene(yol, "sola-itele", { "src/features/itele/presentation/content/content.js": ["let acik = false;", "let acik = true;"] }, async (s) => {
      await s.git(SAYFA);
      const g = "document.documentElement.clientWidth";
      ok("Sola İtele: sayfa daralır", await s.bekleDogru(`Math.abs(document.documentElement.getBoundingClientRect().width - ${g} * 0.7) < 2`));
      ok("Sola İtele: sabit öğe sınırın içine alınır", await s.bekleDogru(`document.getElementById("f").getBoundingClientRect().right <= ${g} * 0.7 + 1`));
    });
    await dene(yol, "voice-tamer", { "src/features/ses/presentation/content/panel.js": ['mode: "closed"', 'mode: "open"'] }, async (s) => {
      await s.git("https://www.youtube.com/");
      ok("Voice Tamer: YouTube'da panel kurulur", await s.bekleDogru(`[...document.querySelectorAll("div")].some((d) => d.shadowRoot?.querySelector("input[type=range]"))`, 20000));
    });
  } catch (h) {
    hatalar.push(`${ad}: istisna ${h.message}`);
  }
}
sunucu.close();
console.log(hatalar.length ? "KALDI: " + hatalar.join(" | ") : `GEÇTİ (${liste.map((y) => basename(y)).join(", ")}; ${sayac} kontrol)`);
process.exit(hatalar.length ? 1 : 0);
