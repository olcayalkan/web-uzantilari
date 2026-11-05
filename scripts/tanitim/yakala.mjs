// sahne.html'i 30 fps kare kare yakalar; kareler ffmpeg ile MP4'e çevrilir (bkz. README > Geliştirici).
// node scripts/tanitim/yakala.mjs <uzantı> <klasör> [t1,t2,...]   — zaman listesi verilirse yalnızca o anlar (png)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sahneAc } from "./tarayici.mjs";

const FPS = 30;
const uzanti = process.argv[2] || "sola-itele";
const klasor = process.argv[3] || `kareler-${uzanti}`;
const anlar = process.argv[4] ? process.argv[4].split(",").map(Number) : null;
mkdirSync(klasor, { recursive: true });

const { cdp, ev, kapat } = await sahneAc(uzanti);
const SURE = await ev("window.SURE");
const liste = anlar ?? Array.from({ length: Math.round(SURE * FPS) }, (_, i) => i / FPS);
for (const [i, t] of liste.entries()) {
  await ev(`window.render(${t})`);
  const png = !!anlar;
  const d = await cdp("Page.captureScreenshot", png ? { format: "png" } : { format: "jpeg", quality: 93 });
  writeFileSync(join(klasor, png ? `an-${t.toFixed(2)}.png` : `${String(i).padStart(4, "0")}.jpg`), Buffer.from(d.result.data, "base64"));
}
await kapat();
console.log(`${liste.length} kare → ${klasor}/`);
