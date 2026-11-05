// Presentation — panel. Yalnızca depoya yazar; sayfalar ve rozet onChanged ile güncellenir.
const acikKutu = document.getElementById('acik');
const oranKaydirici = document.getElementById('oran');
const deger = document.getElementById('deger');
const hazirlar = document.querySelectorAll('[data-oran]');

const goster = (yuzde) => {
  oranKaydirici.value = yuzde;
  deger.textContent = `%${yuzde}`;
  for (const b of hazirlar) b.setAttribute('aria-pressed', String(b.dataset.oran === String(yuzde)));
};

const oranKaydet = (yuzde) => {
  goster(yuzde);
  Depolama.kaydet({ oran: yuzde / 100 });
};

Depolama.yukle().then(({ acik, oran = Sabitler.VARSAYILAN_ORAN }) => {
  acikKutu.checked = !!acik;
  goster(Math.round(oran * 100));
});

acikKutu.addEventListener('change', () => Depolama.kaydet({ acik: acikKutu.checked }));
oranKaydirici.addEventListener('input', () => oranKaydet(Number(oranKaydirici.value)));
for (const b of hazirlar) b.addEventListener('click', () => oranKaydet(Number(b.dataset.oran)));
