// Bir uzantının manifest'inden Firefox manifest'ini üretir ve yazdırır. Chromium ile fark iki yerde:
// Firefox'ta service worker yoktur, arka plan dosyaları tek tek listelenir; bir de eklenti kimliği
// ister. Ayrı üretilir, çünkü Chrome tanımadığı anahtar için uzantı kartında uyarı gösterir.
// Kullanım: node scripts/firefox-manifest.mjs <uzantı klasörü>
import { readFileSync } from "node:fs";
import { basename, join, posix, resolve } from "node:path";

// Mozilla'nın zorunlu veri beyanı: yalnızca Oto Çevirmen seçili metni dışarı gönderir.
const VERI = { "oto-cevirmen": ["websiteContent"] };

export function firefoxManifest(klasor) {
  const ad = basename(resolve(klasor));
  const m = JSON.parse(readFileSync(join(klasor, "manifest.json"), "utf8"));
  const sw = m.background.service_worker;
  const kaynak = readFileSync(join(klasor, sw), "utf8");
  const ice = kaynak.match(/importScripts\(([^)]*)\)/)?.[1] || "";
  const aktarilan = [...ice.matchAll(/["']([^"']+\.js)["']/g)].map(([, y]) => posix.join(posix.dirname(sw), y));
  return {
    ...m,
    background: { scripts: [...aktarilan, sw] },
    browser_specific_settings: {
      gecko: {
        id: `${ad}@web-uzantilari`,
        strict_min_version: "140.0",
        data_collection_permissions: { required: VERI[ad] || ["none"] },
      },
    },
  };
}

if (process.argv[2]) console.log(JSON.stringify(firefoxManifest(process.argv[2]), null, 2));
