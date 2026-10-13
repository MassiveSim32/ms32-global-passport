(()=>{
  const oldStampMarkup=window.stampMarkup;
  const oldStampData=window.stampData;
  if(typeof oldStampMarkup!=='function'||typeof oldStampData!=='function')return;

  const US_STATES=[
    'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'
  ];
  const OTHER_REGIONS=[
    'Tasmania','Victoria','New South Wales','Queensland','South Australia','Western Australia','Northern Territory','Australian Capital Territory','ACT',
    'Ontario','Quebec','British Columbia','Alberta','Manitoba','Saskatchewan','Nova Scotia','New Brunswick','Newfoundland and Labrador','Prince Edward Island',
    'Hokkaido','Okinawa'
  ];
  const REGIONS=[...US_STATES,...OTHER_REGIONS].sort((a,b)=>b.length-a.length);

  function textOf(e){return `${e?.name||''} ${e?.description||''}`;}
  function detectRegion(e){
    const text=textOf(e);
    const lower=text.toLowerCase();
    const hit=REGIONS.find(r=>lower.includes(r.toLowerCase()));
    if(hit)return hit;
    const commaBits=text.split(',').map(s=>s.trim()).filter(Boolean);
    const countryBits=/^(usa|united states|us|u\.s\.|australia|canada|japan|new zealand)$/i;
    for(let i=commaBits.length-1;i>=0;i--){
      const bit=commaBits[i].replace(/[|;].*$/,'').trim();
      if(bit&&!countryBits.test(bit)&&bit.length<=28&&!/\b[A-Z]{4}\b/.test(bit))return bit;
    }
    return'';
  }

  function normalCountryFromText(e,fallback){
    const lower=textOf(e).toLowerCase();
    if(/\b(usa|united states|u\.s\.)\b/.test(lower))return'UNITED STATES';
    if(/\baustralia\b/.test(lower))return'AUSTRALIA';
    if(/\bcanada\b/.test(lower))return'CANADA';
    if(/\bnew zealand\b/.test(lower))return'NEW ZEALAND';
    if(/\bjapan\b/.test(lower))return'JAPAN';
    return String(fallback||'GLOBAL PASSPORT').toUpperCase();
  }

  function fixedBushData(e){
    const s=oldStampData(e);
    if(s?.family!=='bush')return s;
    const generic=/^(BUSH DESTINATION|MS32 DESTINATION|GLOBAL PASSPORT)$/i.test(String(s.city||''));
    const region=detectRegion(e);
    return {
      ...s,
      hero:normalCountryFromText(e,s.hero),
      city:(generic&&region?region:s.city||region||'BUSH DESTINATION').toUpperCase()
    };
  }

  window.stampData=function(e){return fixedBushData(e)};
  window.stampMarkup=function(e){
    const s=fixedBushData(e);
    if(s?.family!=='bush')return oldStampMarkup(e);
    return `<div class="passport-stamp arrival-stamp stamp-bush" style="--stamp-accent:${s.accent}"><div class="stamp-brand"><img src="/icon-192.png" alt=""><span>MS32 GLOBAL PASSPORT</span></div><div class="stamp-family">BUSH FLIGHT · EXPEDITION</div><div class="stamp-country">${esc(s.hero)}</div><div class="stamp-city">${esc(s.city)}</div><div class="stamp-route">${esc(s.route)}</div><div class="stamp-date">${esc(s.date)}</div><div class="stamp-series">${esc(s.series)} · ${esc(s.familyLabel||'BUSH FLIGHT · EXPEDITION VERIFIED')}</div></div>`;
  };

  try{if(typeof renderStampBook==='function')renderStampBook()}catch{}
})();
