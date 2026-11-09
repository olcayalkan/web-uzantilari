// Testlerin ve tanıtım betiklerinin kullanacağı tarayıcıyı bulur: önce CHROME değişkeni,
// sonra macOS ve Windows'un sabit kurulum yerleri, sonra PATH (Linux dağıtımlarında ad değişir).
// Doğrudan çalıştırılınca yolu yazar, bulamazsa 1 ile çıkar.
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

const SABIT = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ...[process.env.ProgramFiles, process.env["ProgramFiles(x86)"]].filter(Boolean)
    .map((k) => join(k, "Google", "Chrome", "Application", "chrome.exe")),
];
const ADLAR = ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser", "brave-browser", "microsoft-edge"];

export function chromeAra() {
  if (process.env.CHROME) return process.env.CHROME;
  const yollar = (process.env.PATH || "").split(delimiter).filter(Boolean);
  return SABIT.find(existsSync)
    || ADLAR.flatMap((ad) => yollar.map((y) => join(y, ad))).find(existsSync)
    || "";
}

export function chromeBul() {
  const yol = chromeAra();
  if (!yol) throw new Error("Chrome bulunamadı. CHROME değişkeniyle yol verilebilir.");
  return yol;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const yol = chromeAra();
  if (yol) console.log(yol);
  process.exit(yol ? 0 : 1);
}
