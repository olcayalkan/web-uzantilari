// Her uzantının manifest'inde ve HTML'lerinde adı geçen dosyaların gerçekten var
// olduğunu denetler. Yol hatası Chrome'da ancak yükleme anında fark edilir; burada
// CI'da yakalanır. Ayrıca paket dışında kalan (src/, icons/ dışı) yolu reddeder.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..");
let hata = 0;
const yaz = (ad, m) => { console.log(`  ✗ ${ad}: ${m}`); hata = 1; };

// İçinde manifest.json olan her kök klasör bir uzantıdır.
const uzantilar = readdirSync(KOK).filter((ad) => existsSync(join(KOK, ad, "manifest.json")));
if (!uzantilar.length) { console.log("  ✗ hiç uzantı bulunamadı"); process.exit(1); }
for (const ad of uzantilar) {
  const kok = join(KOK, ad);
  const m = JSON.parse(readFileSync(join(kok, "manifest.json"), "utf8"));
  const yollar = [
    m.background?.service_worker,
    m.action?.default_popup,
    ...(m.content_scripts || []).flatMap((c) => [...(c.js || []), ...(c.css || [])]),
    ...Object.values(m.icons || {}),
    ...Object.values(m.action?.default_icon || {}),
  ].filter(Boolean);

  // Service worker'ın importScripts'i ve HTML'lerdeki script/link yolları.
  const goreli = (dosya, yol) => normalize(join(dirname(dosya), yol));
  if (m.background?.service_worker) {
    const sw = m.background.service_worker;
    for (const [, y] of readFileSync(join(kok, sw), "utf8").matchAll(/["']([^"']+\.js)["']/g))
      if (/importScripts/.test(readFileSync(join(kok, sw), "utf8"))) yollar.push(goreli(sw, y));
  }
  if (m.action?.default_popup) {
    const html = m.action.default_popup;
    for (const [, y] of readFileSync(join(kok, html), "utf8").matchAll(/(?:src|href)="([^"]+)"/g)) yollar.push(goreli(html, y));
  }

  for (const y of yollar) {
    const temiz = y.replace(/^\//, "");
    if (!existsSync(join(kok, temiz))) yaz(ad, "dosya yok: " + y);
    else if (!/^(src|icons)\//.test(temiz)) yaz(ad, "paket dışında kalır (src/ ya da icons/ altında olmalı): " + y);
  }
  if ("key" in m) yaz(ad, "manifest'te 'key' alanı var; kişisel uzantı kimliği depoya girmemeli");
  if (!hata) console.log(`  ✓ ${ad} ${m.version} — ${yollar.length} yol`);
}
process.exit(hata);
