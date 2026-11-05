// Tek işi var: ikona veya kısayola basılınca sekmedeki panele "aç/kapat" demek.
const toggle = (tab) => {
  if (tab && tab.id != null) {
    chrome.tabs.sendMessage(tab.id, { type: 'vt-toggle' }).catch(() => {
      // Eklentinin çalışmadığı bir sekme - sessizce geç
    });
  }
};

chrome.action.onClicked.addListener(toggle);

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== 'toggle-panel') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  toggle(tab);
});
