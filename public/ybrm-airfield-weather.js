(()=>{
  const host=document.getElementById('major-airfield');
  if(!host)return;

  const style=document.createElement('style');
  style.textContent=`
    .ybrm-weather{display:grid;gap:10px;margin-top:12px}
    .ybrm-weather-block{border:1px solid #31536d;background:linear-gradient(145deg,#10283c,#091725);border-radius:14px;padding:12px}
    .ybrm-weather-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px}
    .ybrm-weather-head b{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8fd2ff}
    .ybrm-weather-head span{font-size:9px;color:#8ea7bb}
    .ybrm-frequency{font-size:21px;font-weight:1000;color:#fff;letter-spacing:.04em}
    .ybrm-raw{font:10px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;color:#d8e5ee;white-space:pre-wrap;word-break:break-word;margin-top:7px}
    .ybrm-summary{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}
    .ybrm-summary div{border:1px solid #223e53;background:#0a1927;border-radius:10px;padding:8px}
    .ybrm-summary small{display:block;color:#8ea7bb;font-size:8px;text-transform:uppercase;letter-spacing:.08em}
    .ybrm-summary strong{display:block;color:#fff;font-size:11px;margin-top:2px}
    .ybrm-weather-note{font-size:9px;line-height:1.45;color:#9fb4c4}
    .ybrm-refresh{border:1px solid #2e6f9b;background:#12304a;color:#fff;border-radius:11px;padding:9px 11px;font-size:9px;font-weight:900;cursor:pointer}
    @media(max-width:360px){.ybrm-summary{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  host.innerHTML=`
    <div class="eyebrow">YBRM</div>
    <h3>Broome Airfield Information</h3>
    <p class="sub">Live aviation weather and published Broome radio information for the Major Event Hub.</p>
    <div class="ybrm-weather">
      <div class="ybrm-weather-block">
        <div class="ybrm-weather-head"><b>ATIS</b><span>Broome</span></div>
        <div class="ybrm-frequency">128.2 MHz</div>
        <div class="ybrm-weather-note">Use Broome ATIS for the current operational broadcast during tower hours.</div>
      </div>
      <div class="ybrm-weather-block">
        <div class="ybrm-weather-head"><b>AWIS</b><span>Automated Weather</span></div>
        <div class="ybrm-frequency">126.55 MHz</div>
        <div class="ybrm-weather-note">AWIS phone: 08 6216 2603. The published AWIS frequency requires a one-second carrier pulse and transmits for about 90 seconds.</div>
      </div>
      <div class="ybrm-weather-block" id="ybrmMetarBlock">
        <div class="ybrm-weather-head"><b>METAR / SPECI</b><span id="ybrmMetarAge">Loading…</span></div>
        <div class="ybrm-raw" id="ybrmMetar">Fetching latest YBRM observation…</div>
        <div class="ybrm-summary" id="ybrmSummary"></div>
      </div>
      <div class="ybrm-weather-block">
        <div class="ybrm-weather-head"><b>TAF</b><span>Forecast</span></div>
        <div class="ybrm-raw" id="ybrmTaf">Fetching latest YBRM forecast…</div>
      </div>
      <button class="ybrm-refresh" type="button" id="ybrmRefresh">REFRESH WEATHER</button>
      <div class="ybrm-weather-note">Weather data is supplementary. For flight operations, confirm current official information through the appropriate aviation weather and ATC services.</div>
    </div>`;

  const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const val=(v,suffix='')=>v===null||v===undefined||v===''?'—':`${esc(v)}${suffix}`;

  async function fetchJson(url){
    const r=await fetch(url,{cache:'no-store'});
    if(!r.ok)throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function loadWeather(){
    const metarEl=document.getElementById('ybrmMetar');
    const tafEl=document.getElementById('ybrmTaf');
    const ageEl=document.getElementById('ybrmMetarAge');
    const summaryEl=document.getElementById('ybrmSummary');
    if(!metarEl||!tafEl)return;
    metarEl.textContent='Fetching latest YBRM observation…';
    tafEl.textContent='Fetching latest YBRM forecast…';
    ageEl.textContent='Loading…';
    summaryEl.innerHTML='';
    try{
      const [metars,tafs]=await Promise.all([
        fetchJson('https://aviationweather.gov/api/data/metar?ids=YBRM&format=json'),
        fetchJson('https://aviationweather.gov/api/data/taf?ids=YBRM&format=json')
      ]);
      const m=Array.isArray(metars)?metars[0]:null;
      const t=Array.isArray(tafs)?tafs[0]:null;
      metarEl.textContent=m?.rawOb||m?.raw_text||'No current METAR returned.';
      tafEl.textContent=t?.rawTAF||t?.raw_text||'No current TAF returned.';
      const reportTime=m?.reportTime||m?.obsTime||m?.receiptTime;
      ageEl.textContent=reportTime?new Date(reportTime).toLocaleString('en-AU',{timeZone:'UTC',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false})+' UTC':'Latest report';
      const wind=(m?.wdir!==undefined&&m?.wspd!==undefined)?`${m.wdir}° / ${m.wspd} kt${m?.wgst?` G${m.wgst}`:''}`:'—';
      summaryEl.innerHTML=`
        <div><small>Flight Category</small><strong>${val(m?.fltCat)}</strong></div>
        <div><small>Wind</small><strong>${esc(wind)}</strong></div>
        <div><small>Visibility</small><strong>${val(m?.visib,' SM')}</strong></div>
        <div><small>Temperature</small><strong>${val(m?.temp,' °C')}</strong></div>
        <div><small>Dew Point</small><strong>${val(m?.dewp,' °C')}</strong></div>
        <div><small>Altimeter</small><strong>${val(m?.altim,' hPa')}</strong></div>`;
    }catch(err){
      metarEl.textContent='Live METAR unavailable right now. Use YBRM AWIS 126.55 or official aviation weather services.';
      tafEl.textContent='Live TAF unavailable right now. Check official aviation weather services for the current YBRM forecast.';
      ageEl.textContent='Feed unavailable';
      summaryEl.innerHTML='';
    }
  }

  document.getElementById('ybrmRefresh')?.addEventListener('click',loadWeather);
  loadWeather();
})();