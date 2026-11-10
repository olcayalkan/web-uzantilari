// Arka plan: tek işi simge rozetini (AÇIK) depodaki duruma eşitlemek.
// Firefox'ta arka plan bir sayfadır, importScripts yoktur; dosyaları manifest yükler.
if (typeof importScripts === 'function') importScripts('../core/sabitler.js', '../features/itele/data/depolama.js');

const rozet = (acik) => chrome.action.setBadgeText({ text: acik ? 'AÇIK' : '' });

const rozetiYenile = async () => rozet((await Depolama.yukle()).acik);

chrome.runtime.onInstalled.addListener(rozetiYenile);
chrome.runtime.onStartup.addListener(rozetiYenile);

Depolama.izle((ayar) => { if ('acik' in ayar) rozet(ayar.acik); });
