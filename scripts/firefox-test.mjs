// Uzantıların Firefox paketlerini gerçek, görünmez Firefox'a kurup dener (WebDriver BiDi,
// bağımlılıksız). Fareyle seçim gerçek olaylarla yapılır. Kapalı Shadow DOM sayfadan okunamadığı
// için paketin deneme kopyasında açık kurulur. FIREFOX değişkeniyle yol verilebilir; Firefox
// yoksa atlanır.
// Kullanım: node scripts/firefox-test.mjs <dist klasörü>
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { delimiter, dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const DIST = resolve(process.argv[2] || "dist");
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const aday = [
  process.env.FIREFOX,
  "/Applications/Firefox.app/Contents/MacOS/firefox",
  ...[process.env.ProgramFiles, process.env["ProgramFiles(x86)"]].filter(Boolean).map((k) => join(k, "Mozilla Firefox", "firefox.exe")),
  ...(process.env.PATH || "").split(delimiter).filter(Boolean).map((y) => join(y, "firefox")),
].filter(Boolean);
const FIREFOX = aday.find(existsSync);
if (!FIREFOX) { console.log("Firefox bulunamadı, atlandı"); process.exit(0); }

const profil = mkdtempSync(join(tmpdir(), "ff-test-"));
writeFileSync(join(profil, "user.js"), [
  `user_pref("browser.shell.checkDefaultBrowser", false);`,
  `user_pref("datareporting.policy.dataSubmissionEnabled", false);`,
  `user_pref("media.autoplay.default", 0);`,
].join("\n"));

const VT = join(dirname(fileURLToPath(import.meta.url)), "..", "voice-tamer");
const TUR = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const sunucu = createServer((i, y) => {
  const yol = new URL(i.url, "http://x").pathname;
  if (yol.startsWith("/vt/")) {
    const dosya = join(VT, normalize(yol.slice(4)));
    if (!dosya.startsWith(VT) || !existsSync(dosya)) return y.writeHead(404).end();
    return y.writeHead(200, { "content-type": TUR[extname(dosya)] || "application/octet-stream" }).end(readFileSync(dosya));
  }
  y.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(
  `<!doctype html><title>t</title><body style="margin:0;font:40px sans-serif"><p id="m" style="margin:100px 20px">Good morning my dear friend</p>
   <p id="k" style="margin:100px 20px">TWVyaGFiYQ==</p><div id="f" style="position:fixed;right:0;bottom:0;width:100px;height:40px"></div></body>`
  );
}).listen(0, "127.0.0.1");
await new Promise((r) => sunucu.once("listening", r));
const SAYFA = `http://127.0.0.1:${sunucu.address().port}/`;

const ff = spawn(FIREFOX, ["--headless", "--no-remote", "--profile", profil, "--remote-debugging-port", "0"], { stdio: ["ignore", "pipe", "pipe"] });
const adres = await new Promise((tamam, hata) => {
  const zaman = setTimeout(() => hata(new Error("Firefox BiDi açılmadı")), 60000);
  const oku = (b) => { const e = String(b).match(/WebDriver BiDi listening on (ws:\/\/\S+)/); if (e) { clearTimeout(zaman); tamam(e[1]); } };
  ff.stdout.on("data", oku); ff.stderr.on("data", oku);
});
const ws = new WebSocket(`${adres}/session`);
await new Promise((r, h) => { ws.onopen = r; ws.onerror = h; });
let no = 0; const bekleyen = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && bekleyen.has(d.id)) { bekleyen.get(d.id)(d); bekleyen.delete(d.id); } };
const bidi = async (method, params = {}) => {
  const d = await new Promise((r) => { bekleyen.set(++no, r); ws.send(JSON.stringify({ id: no, method, params })); });
  if (d.type === "error") throw new Error(`${method}: ${d.error} ${d.message || ""}`);
  return d.result;
};

const hatalar = []; let sayac = 0;
const ok = (ad, k, detay) => { sayac++; if (!k) { hatalar.push(ad + (detay ? ` (${detay})` : "")); } };
await bidi("session.new", { capabilities: {} });
const baglam = (await bidi("browsingContext.getTree", {})).contexts[0].context;
const git = (url) => bidi("browsingContext.navigate", { context: baglam, url, wait: "complete" });
const degerlendir = async (ifade) => {
  const r = await bidi("script.evaluate", { expression: `(async () => JSON.stringify(await (${ifade})))()`, target: { context: baglam }, awaitPromise: true, resultOwnership: "none" });
  if (r.type === "exception") throw new Error(`${ifade.slice(0, 60)}: ${r.exceptionDetails.text}`);
  return r.result.value === undefined ? undefined : JSON.parse(r.result.value);
};
const surukle = async (x1, y, x2) => {
  const adim = (type, ek = {}) => ({ type, ...ek });
  await bidi("input.performActions", { context: baglam, actions: [{ type: "pointer", id: "fare", parameters: { pointerType: "mouse" }, actions: [
    adim("pointerMove", { x: x1, y }), adim("pointerDown", { button: 0 }),
    adim("pointerMove", { x: x2, y, duration: 120 }), adim("pointerUp", { button: 0 }),
  ] }] });
};
const olc = (id) => `(() => { const r = document.getElementById(${JSON.stringify(id)}).getBoundingClientRect(); return { x: Math.round(r.left), s: Math.round(r.right), y: Math.round(r.top + r.height / 2) }; })()`;
const bekleDogru = async (ifade, ms = 8000) => {
  const son = Date.now() + ms;
  while (Date.now() < son) { if (await degerlendir(ifade)) return true; await bekle(150); }
  return false;
};

try {
  // Paketi deneme klasörüne açar, verilen dosyalarda değişiklik yapıp geçici eklenti olarak kurar.
  const kur = async (ad, degisiklik = {}) => {
    const klasor = join(profil, "paket-" + ad);
    const a = spawnSync("unzip", ["-q", join(DIST, `${ad}-firefox.zip`), "-d", klasor]);
    if (a.status !== 0) throw new Error("zip açılamadı: " + ad);
    for (const [dosya, [eski, yeni]] of Object.entries(degisiklik)) {
      const yol = join(klasor, dosya);
      const metin = readFileSync(yol, "utf8");
      if (!metin.includes(eski)) throw new Error(`${dosya} içinde yok: ${eski}`);
      writeFileSync(yol, metin.replace(eski, yeni));
    }
    return (await bidi("webExtension.install", { extensionData: { type: "path", path: klasor } })).extension;
  };
  const ACIK_KOK = ['mode: "closed"', 'mode: "open"'];

  // Oto Çevirmen: seçim arka plana, oradan gerçek Google uç noktasına gider, çeviri balona döner.
  const cevirmen = await kur("oto-cevirmen", { "src/features/ceviri/presentation/content/content.js": ACIK_KOK });
  await git(SAYFA);
  const m = await degerlendir(olc("m"));
  await surukle(m.x + 2, m.y, m.x + 400);
  const balonYazisi = `document.querySelector("ceviri-balonu")?.shadowRoot.querySelector(".ust .dil")?.textContent`;
  const dil = await bekleDogru(`${balonYazisi}?.includes("→ Türkçe")`);
  ok("Oto Çevirmen: fareyle seçimde çeviri balonda görünür", dil, await degerlendir(`document.querySelector("ceviri-balonu")?.shadowRoot.querySelector(".balon")?.textContent ?? "balon yok"`));
  await bidi("webExtension.uninstall", { extension: cevirmen });

  // Oto Çözücü: seçilen Base64 balonda çözülür.
  const cozucu = await kur("oto-cozucu");
  await git(SAYFA);
  const k = await degerlendir(olc("k"));
  await surukle(k.x + 1, k.y, k.x + 500);
  ok("Oto Çözücü: seçimde balon açılır", await bekleDogru(`document.querySelector("[data-cozucu]")?.textContent.includes("Merhaba")`));
  await bidi("webExtension.uninstall", { extension: cozucu });

  // Sola İtele: anahtar açık başlatılır; depo söz veriyle okunur, sayfa ve sabit öğe daralır.
  const sola = await kur("sola-itele", { "src/features/itele/presentation/content/content.js": ["let acik = false;", "let acik = true;"] });
  await git(SAYFA);
  const genis = `document.documentElement.clientWidth`;
  ok("Sola İtele: sayfa daralır", await bekleDogru(`Math.abs(document.documentElement.getBoundingClientRect().width - ${genis} * 0.7) < 2`));
  ok("Sola İtele: sabit öğe sınırın içine alınır", await bekleDogru(`document.getElementById("f").getBoundingClientRect().right <= ${genis} * 0.7 + 1`));
  await bidi("webExtension.uninstall", { extension: sola });

  // Voice Tamer: içerik betikleri yalnızca YouTube'da çalışır; panel orada kurulur.
  const vt = await kur("voice-tamer", { "src/features/ses/presentation/content/panel.js": ['mode: "closed"', 'mode: "open"'] });
  await git("https://www.youtube.com/");
  const panel = `[...document.querySelectorAll("div")].find((d) => d.shadowRoot?.querySelector("input[type=range]"))`;
  ok("Voice Tamer: YouTube'da panel kurulur", await bekleDogru(`!!${panel}`, 20000));
  await bidi("webExtension.uninstall", { extension: vt });

  // Voice Tamer'ın ses zinciri: DSP test paketi Firefox'un Web Audio'sunda koşar.
  await git(`${SAYFA}vt/tests/test.html?oto`);
  const son = Date.now() + 90000;
  let baslik = "";
  while (Date.now() < son && !/^(PASS|FAIL)/.test(baslik)) { await bekle(500); baslik = await degerlendir("document.title"); }
  const kalanlar = /^PASS/.test(baslik) ? "" : await degerlendir(`document.getElementById("out")?.textContent.split("\\n").filter((s) => /KALDI/.test(s)).slice(0, 12).join(" ; ")`);
  ok("Voice Tamer: ses testleri", /^PASS/.test(baslik), `${baslik} ${kalanlar}`);
} catch (h) {
  hatalar.push("istisna: " + h.message);
} finally {
  try { await bidi("session.end"); } catch {}
  ws.close(); ff.kill(); sunucu.close();
  await bekle(500); rmSync(profil, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
console.log(hatalar.length ? "KALDI: " + hatalar.join(" | ") : `GEÇTİ (${sayac} kontrol)`);
process.exit(hatalar.length ? 1 : 0);
