// Araç çubuğu ikonu / klavye kısayolu -> panel aç-kapat
// content.js ile aynı isolated world'de çalıştığı için window.__voiceTamer'a doğrudan erişir.
chrome.runtime.onMessage.addListener((msg, sender) => {
  // Sadece kendi service worker'ımızdan gelen mesajı kabul et.
  // (externally_connectable tanımlı değil, ama yine de açıkça doğruluyoruz.)
  if (!sender || sender.id !== chrome.runtime.id) return;
  if (msg && msg.type === 'vt-toggle') window.__voiceTamer?.toggleUI();
});
