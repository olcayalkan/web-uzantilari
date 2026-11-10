// Presentation katmanı: sayfa üstündeki ayar paneli. Ses motorunu tanımaz, ayar
// nesnesini değiştirip `uygula` geri çağrısıyla haber verir.
(function (global) {
  "use strict";
  const K = global.Sabitler;
  const clamp = global.Ayarlar.clamp;

  /* Şablon DOMParser ile kurulur, innerHTML YouTube'un Trusted Types politikasına
   * takılırdı. Şablonda dinamik veri olmadığından enjeksiyon yüzeyi de yok. */
  const TPL = `<style>
    :host{all:initial}
    .p{font:12px/1.4 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#e8e8ea;
       background:rgba(24,24,27,.94);backdrop-filter:blur(12px);border:1px solid #3f3f46;
       border-radius:10px;width:246px;box-shadow:0 8px 28px rgba(0,0,0,.5);overflow:hidden}
    .h{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:move;
       background:#27272a;border-bottom:1px solid #3f3f46;user-select:none}
    .h b{font-size:12px;font-weight:600;flex:1}
    .sw{position:relative;width:32px;height:18px;border-radius:9px;background:#52525b;cursor:pointer;transition:.15s}
    .sw.on{background:#22c55e}
    .sw i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:.15s}
    .sw.on i{left:16px}
    .x{cursor:pointer;opacity:.6;padding:0 2px}.x:hover{opacity:1}
    .b{padding:8px 10px 10px;max-height:70vh;overflow-y:auto}
    .g{font-size:10px;letter-spacing:.06em;text-transform:uppercase;opacity:.45;
       margin:11px 0 2px;font-weight:600}
    .b .g:first-child{margin-top:0}
    .r{margin:7px 0}
    .r label{display:flex;justify-content:space-between;margin-bottom:3px;opacity:.85}
    .r label span{opacity:.65;font-variant-numeric:tabular-nums}
    input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:3px;border-radius:2px;background:#52525b;outline:none}
    input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;
       border-radius:50%;background:#e4e4e7;cursor:pointer}
    input[type=range]::-moz-range-thumb{width:12px;height:12px;border:0;
       border-radius:50%;background:#e4e4e7;cursor:pointer}
    .pre{display:flex;gap:5px;margin-top:9px}
    .pre button{flex:1;font:11px -apple-system,system-ui,sans-serif;color:#d4d4d8;background:#3f3f46;
       border:0;border-radius:5px;padding:5px 0;cursor:pointer}
    .pre button:hover{background:#52525b}
    .m{margin-top:8px;height:3px;background:#3f3f46;border-radius:2px;overflow:hidden}
    .m i{display:block;height:100%;width:0;background:#f59e0b;transition:width .05s}
  </style>
  <div class="p">
    <div class="h"><b>Voice Tamer</b><div class="sw" id="sw"><i></i></div><div class="x" id="x">&#10005;</div></div>
    <div class="b">
      <div class="g">Gırtlak / boğukluk</div>
      <div class="r"><label>G&#305;rtlak azaltma <span id="v4"></span></label>
        <input type="range" id="throatAmt" min="0" max="0.98" step="0.05"></div>
      <div class="r"><label>G&#305;rtlak frekans&#305; <span id="v5"></span></label>
        <input type="range" id="throatFreq" min="200" max="900" step="10"></div>
      <div class="r"><label>Alt kesim (h&#305;r&#305;lt&#305;) <span id="v8"></span></label>
        <input type="range" id="hpFreq" min="60" max="250" step="5"></div>

      <div class="g">Seviye kontrol&#252;</div>
      <div class="r"><label>Seviye sabitleme <span id="v9"></span></label>
        <input type="range" id="level" min="0" max="1" step="0.05"></div>
      <div class="r"><label>Patlama bast&#305;rma <span id="v12"></span></label>
        <input type="range" id="burstMax" min="0" max="36" step="0.5"></div>
      <div class="r"><label>Patlama frekans&#305; <span id="v13"></span></label>
        <input type="range" id="burstFreq" min="500" max="3000" step="50"></div>
      <div class="r"><label>Patlama hassasiyeti <span id="v14"></span></label>
        <input type="range" id="burstSens" min="1.10" max="3.00" step="0.05"></div>
      <div class="r"><label>S&#305;k&#305;&#351;t&#305;rma <span id="v10"></span></label>
        <input type="range" id="comp" min="0" max="1" step="0.05"></div>

      <div class="g">Tiz / sertlik</div>
      <div class="r"><label>Tiz / S sesi kesme <span id="v1"></span></label>
        <input type="range" id="deessMax" min="0" max="24" step="0.5"></div>
      <div class="r"><label>S sesi frekans&#305; <span id="v2"></span></label>
        <input type="range" id="deessFreq" min="4500" max="9500" step="100"></div>
      <div class="r"><label>Hassasiyet <span id="v3"></span></label>
        <input type="range" id="deessSens" min="0.05" max="0.40" step="0.01"></div>
      <div class="r"><label>Sertlik kesme <span id="v6"></span></label>
        <input type="range" id="harshCut" min="0" max="20" step="0.5"></div>
      <div class="r"><label>Sertlik frekans&#305; <span id="v7"></span></label>
        <input type="range" id="harshFreq" min="800" max="5000" step="100"></div>

      <div class="g">Frekans dengeleme</div>
      <div class="r"><label>Dengeleme g&#252;c&#252; <span id="v15"></span></label>
        <input type="range" id="evenAmt" min="0" max="1" step="0.05"></div>
      <div class="r"><label>Dengeleme derinli&#287;i <span id="v16"></span></label>
        <input type="range" id="evenDepth" min="0" max="20" step="0.5"></div>

      <div class="g">&#199;&#305;k&#305;&#351;</div>
      <div class="r"><label>Ses seviyesi <span id="v11"></span></label>
        <input type="range" id="output" min="0.2" max="3" step="0.05"></div>
      <div class="m"><i id="meter"></i></div>
      <div class="pre">
        <button data-p="soft">Hafif</button><button data-p="mid">Orta</button><button data-p="hard">Sert</button><button data-p="max">Maks</button>
      </div>
    </div>
  </div>`;

  const dBf = (v) => `-${(+v).toFixed(1)} dB`;
  const kHz = (v) => `${Math.round(v / 100) / 10} kHz`;
  const pct = (v) => `${Math.round(v * 100)}%`;
  const fmt = {
    deessMax: dBf, deessFreq: kHz, deessSens: (v) => (+v).toFixed(2),
    throatAmt: (v) => `%${Math.round(v * 100)} (${(v >= 0.999 ? -40 : 20 * Math.log10(1 - v)).toFixed(1)} dB)`,
    throatFreq: (v) => `${Math.round(v)} Hz`,
    harshCut: dBf, harshFreq: kHz,
    hpFreq: (v) => `${Math.round(v)} Hz`,
    level: pct, comp: pct, output: pct,
    burstMax: dBf, burstFreq: (v) => `${Math.round(v)} Hz`,
    burstSens: (v) => `×${(+v).toFixed(2)}`,
    evenAmt: pct, evenDepth: dBf,
  };

  /* secenek.uygula: ayar değişince çağrılır (kaydet + sese uygula)
   * secenek.zincir: o anki ses zincirini döndürür (kesim göstergesi için)
   * secenek.gizliMi / gizliYaz: panelin açık/kapalı durumunun kalıcılığı */
  function kur(S, secenek) {
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;z-index:2147483647;right:16px;bottom:16px;";
    const sh = host.attachShadow({ mode: "closed" });   // sayfa scriptleri panele erişemez
    const parsed = new DOMParser().parseFromString(TPL, "text/html");
    for (const n of [...parsed.head.children, ...parsed.body.children]) sh.appendChild(n);
    document.documentElement.appendChild(host);

    const $ = (id) => sh.querySelector("#" + id);
    const sync = () => K.KEYS.forEach((k, i) => { $(k).value = S[k]; $("v" + (i + 1)).textContent = fmt[k](S[k]); });
    K.KEYS.forEach((k, i) => $(k).addEventListener("input", (e) => {
      const v = Number(e.target.value);
      if (!Number.isFinite(v)) return;
      S[k] = clamp(v, K.SPEC[k].min, K.SPEC[k].max);
      $("v" + (i + 1)).textContent = fmt[k](S[k]);
      secenek.uygula();
    }));

    sh.querySelectorAll(".pre button").forEach((b) => b.onclick = () => {
      const p = K.PRESETS[b.dataset.p];
      for (const k of K.KEYS) if (k in p) S[k] = clamp(p[k], K.SPEC[k].min, K.SPEC[k].max);
      sync(); secenek.uygula();
    });

    const swEl = $("sw");
    const paintSw = () => swEl.classList.toggle("on", S.on);
    swEl.onclick = () => { S.on = !S.on; paintSw(); secenek.uygula(); };

    let hidden = false, meterTimer = null;
    function paintMeter() {
      const chain = secenek.zincir();
      if (!chain) return;
      $("meter").style.width = clamp(-chain.deess.gain.value / 20 * 100, 0, 100) + "%";
    }
    const setHidden = (h) => {
      hidden = !!h;
      host.style.display = hidden ? "none" : "";
      secenek.gizliYaz(hidden);
      if (hidden) { clearInterval(meterTimer); meterTimer = null; }
      else if (!meterTimer) meterTimer = setInterval(paintMeter, 80);
    };
    $("x").onclick = () => setHidden(true);

    // Sürükleme dinleyicileri yalnızca sürüklerken bağlı kalır
    (() => {
      const h = sh.querySelector(".h");
      let dx = 0, dy = 0;
      const move = (e) => {
        host.style.left = clamp(e.clientX - dx, 0, innerWidth - 250) + "px";
        host.style.top = clamp(e.clientY - dy, 0, innerHeight - 40) + "px";
      };
      const up = () => {
        removeEventListener("mousemove", move);
        removeEventListener("mouseup", up);
      };
      h.addEventListener("mousedown", (e) => {
        const r = host.getBoundingClientRect();
        dx = e.clientX - r.left; dy = e.clientY - r.top;
        host.style.left = r.left + "px"; host.style.top = r.top + "px";
        host.style.right = "auto"; host.style.bottom = "auto";
        addEventListener("mousemove", move);
        addEventListener("mouseup", up);
        e.preventDefault();
      });
    })();

    sync(); paintSw();
    setHidden(secenek.gizliMi());

    return { toggleUI: () => setHidden(!hidden) };
  }

  global.Panel = { kur };
})(typeof self !== "undefined" ? self : this);
