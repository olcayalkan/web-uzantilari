// sahne.html'i görünmez Chrome'da açar (DevTools protokolü, bağımlılıksız).
// Depo kökü yerel bir sunucudan verilir: sahne uzantıların gerçek dosyalarını oradan yükler.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { chromeBul } from "../chrome-bul.mjs";

export const KOK = fileURLToPath(new URL("../..", import.meta.url));
const TUR = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
const CHROME = chromeBul();
export const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

export async function sahneAc(uzanti, adres = `/scripts/tanitim/sahne.html?u=${uzanti}`) {
  const sunucu = createServer((i, y) => {
    const yol = normalize(join(KOK, decodeURIComponent(new URL(i.url, "http://x").pathname)));
    if (!yol.startsWith(KOK) || !existsSync(yol)) return y.writeHead(404).end();
    y.writeHead(200, { "content-type": TUR[extname(yol)] || "application/octet-stream" }).end(readFileSync(yol));
  }).listen(0, "127.0.0.1");
  await new Promise((r) => sunucu.once("listening", r));

  const profil = mkdtempSync(join(tmpdir(), "tanitim-"));
  const chrome = spawn(CHROME, ["--headless=new", "--hide-scrollbars", "--force-prefers-no-reduced-motion",
    "--remote-debugging-port=0", `--user-data-dir=${profil}`, "about:blank"], { stdio: "ignore" });
  let port;
  for (let i = 0; i < 100 && !port; i++) { await bekle(100); try { port = readFileSync(join(profil, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch {} }
  if (!port) throw new Error("Chrome açılmadı: " + CHROME);
  const hedef = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((h) => h.type === "page");
  const ws = new WebSocket(hedef.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let no = 0; const bekleyen = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); bekleyen.get(d.id)?.(d); };
  const cdp = (method, params = {}) => new Promise((r) => { bekleyen.set(++no, r); ws.send(JSON.stringify({ id: no, method, params })); });
  const ev = async (e) => {
    const d = await cdp("Runtime.evaluate", { expression: e, awaitPromise: true, returnByValue: true });
    if (d.result?.exceptionDetails) throw new Error(e.slice(0, 80) + " → " + JSON.stringify(d.result.exceptionDetails.exception?.description || d.result.exceptionDetails).slice(0, 400));
    return d.result?.result?.value;
  };
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await cdp("Page.navigate", { url: `http://127.0.0.1:${sunucu.address().port}${adres}` });
  if (adres.includes("sahne.html")) {
    for (let i = 0; i < 100 && !(await ev("window.hazir === true")); i++) await bekle(100);
    if (!(await ev("window.hazir === true"))) throw new Error("sahne hazırlanamadı");
  } else await bekle(800);
  const kapat = async () => { ws.close(); chrome.kill(); sunucu.close(); await bekle(200); rmSync(profil, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); };   // Chrome kapanırken profile hâlâ yazıyor olabilir
  return { cdp, ev, kapat };
}
