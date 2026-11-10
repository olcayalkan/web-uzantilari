// tests/test.html'i görünmez Chrome'da çalıştırır, sonucu yazdırır; başarıda 0 ile çıkar.
// --dump-dom asenkron ses testini beklemeden döktüğü için DevTools protokolüyle
// başlık PASS/FAIL olana kadar beklenir. Bağımlılık yok: Node 22'nin yerleşik WebSocket'i.
// Kullanım: node tests/calistir.mjs   (CHROME değişkeniyle farklı Chrome yolu verilebilir)
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromeBul } from "../../scripts/chrome-bul.mjs";

const KOK = fileURLToPath(new URL("..", import.meta.url));
const CHROME = chromeBul();
const TUR = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

// Sayfa fetch() kullandığı için file:// yetmez; yalnızca uzantı klasörünü sunan yerel sunucu.
const sunucu = createServer((istek, yanit) => {
  const yol = normalize(join(KOK, decodeURIComponent(new URL(istek.url, "http://x").pathname)));
  if (!yol.startsWith(KOK) || !existsSync(yol)) { yanit.writeHead(404).end(); return; }
  yanit.writeHead(200, { "content-type": TUR[extname(yol)] || "application/octet-stream" }).end(readFileSync(yol));
}).listen(0, "127.0.0.1");
await new Promise((r) => sunucu.once("listening", r));

const profil = mkdtempSync(join(tmpdir(), "vt-test-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run",
  "--autoplay-policy=no-user-gesture-required", "--remote-debugging-port=0",
  `--user-data-dir=${profil}`, "about:blank"], { stdio: "ignore" });

let kod = 1;
try {
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    await bekle(100);
    try { port = readFileSync(join(profil, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch (_) {}
  }
  if (!port) throw new Error("Chrome açılmadı: " + CHROME);
  const hedefler = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const ws = new WebSocket(hedefler.find((h) => h.type === "page").webSocketDebuggerUrl);
  await new Promise((r, h) => { ws.onopen = r; ws.onerror = h; });
  let no = 0; const bekleyen = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); bekleyen.get(d.id)?.(d.result); };
  const cdp = (method, params) => new Promise((r) => { bekleyen.set(++no, r); ws.send(JSON.stringify({ id: no, method, params })); });
  const degerlendir = async (ifade) => (await cdp("Runtime.evaluate", { expression: ifade, returnByValue: true })).result.value;

  await cdp("Page.navigate", { url: `http://127.0.0.1:${sunucu.address().port}/tests/test.html?oto` });
  let baslik = "";
  for (let i = 0; i < 120 && !/^(PASS|FAIL)/.test(baslik); i++) { await bekle(500); baslik = await degerlendir("document.title"); }
  const cikti = (await degerlendir("document.getElementById('out')?.textContent")) || "";
  for (const satir of cikti.split("\n")) if (/KALDI|SONUC/.test(satir)) console.log(satir);
  console.log(baslik || "KALDI: sonuç okunamadı");
  kod = baslik.startsWith("PASS") ? 0 : 1;
  ws.close();
} catch (h) {
  console.error("KALDI:", h.message);
} finally {
  chrome.kill(); sunucu.close();
  await bekle(300); rmSync(profil, { recursive: true, force: true });
}
process.exit(kod);
