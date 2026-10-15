(()=>{
  const oldData=window.stampData;
  const oldMarkup=window.stampMarkup;
  if(typeof oldData!=='function'||typeof oldMarkup!=='function')return;

  function localLocation(e){
    if(!String(e?.id||'').startsWith('flying-now:'))return null;
    const name=String(e?.name||'');
    const m=name.match(/^Flying Now · (LOCAL FLIGHT|TEST FLIGHT) to (.+?),\s*([^·]+?)(?:\s*·\s*.+)?$/i);
    if(!m)return null;
    return {mode:m[1].toUpperCase(),city:m[2].trim().toUpperCase(),country:m[3].trim().toUpperCase()};
  }

  function fixedData(e){
    const s=oldData(e);
    const loc=localLocation(e);
    if(!loc)return s;
    return {...s,hero:loc.country,city:loc.city,family:'spontaneous',familyLabel:loc.mode==='TEST FLIGHT'?'FLIGHT TEST · MS32 VERIFIED':'LOCAL EXPLORATION · MS32 VERIFIED'};
  }

  window.stampData=fixedData;
  window.stampMarkup=function(e){
    const loc=localLocation(e);
    if(!loc)return oldMarkup(e);
    const s=fixedData(e);
    const label=loc.mode==='TEST FLIGHT'?'FLIGHT TEST':'LOCAL EXPLORATION';
    return `<div class="passport-stamp arrival-stamp stamp-spontaneous"><div class="stamp-family">${label}</div><div class="stamp-country">${esc(s.hero)}</div><div class="stamp-city">${esc(s.city)}</div><div class="stamp-date">${esc(s.date)}</div><div class="stamp-series">MS32 VERIFIED</div></div>`;
  };

  try{if(typeof renderStampBook==='function')renderStampBook()}catch{}
})();