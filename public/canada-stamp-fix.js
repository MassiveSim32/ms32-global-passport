(()=>{
  const originalMarkup=window.stampMarkup;
  const originalData=window.stampData;
  if(typeof originalMarkup!=='function')return;

  const style=document.createElement('style');
  style.textContent=`
    .passport-stamp .stamp-maple{position:relative;z-index:1;font-size:15px;line-height:1;margin:3px 0 0;filter:saturate(1.1)}
    .stamp-modal-card .passport-stamp .stamp-maple{font-size:23px;margin-top:5px}
  `;
  document.head.appendChild(style);

  const cityByIcao={
    CYYT:"St. John's",
    CYYG:'Charlottetown',
    CYQY:'Sydney'
  };

  // This Discord event was renamed after pilots had already registered. Historic
  // registration rows still contain its previous CYYG title, so the Passport
  // renderer must use the corrected route for this event ID regardless of which
  // snapshot is currently available in the browser.
  const correctedEvents={
    '1560151541690794014':{from:'CYYT',to:'CYQY',city:'Sydney',country:'Canada'}
  };

  function correctedRoute(e){
    return correctedEvents[String(e?.id||'')]||null;
  }

  function canadianIcaos(e){
    const forced=correctedRoute(e);
    if(forced)return[forced.from,forced.to];
    const text=`${e?.name||''} ${e?.description||''}`.toUpperCase();
    return (text.match(/\bC[A-Z0-9]{3}\b/g)||[]).filter(code=>code!=='CLUB');
  }

  function resolvedStamp(e){
    const forced=correctedRoute(e);
    if(forced)return forced;
    const hits=canadianIcaos(e);
    if(!hits.length)return null;
    const destination=hits[hits.length-1];
    return {
      from:hits.length>=2?hits[0]:'',
      to:destination,
      city:cityByIcao[destination]||'',
      country:'Canada'
    };
  }

  function fixMarkup(markup,e){
    const resolved=resolvedStamp(e);
    if(!resolved)return markup;
    let out=String(markup||'');
    out=out.replace(/(<div class="stamp-country">)[\s\S]*?(<\/div>)/,'$1CANADA$2');
    if(resolved.city)out=out.replace(/(<div class="stamp-city">)[\s\S]*?(<\/div>)/,`$1${resolved.city}$2`);
    if(resolved.from&&resolved.to){
      const route=`${resolved.from} → ${resolved.to}`;
      out=out.replace(/(<div class="stamp-route">)[\s\S]*?(<\/div>)/,`$1${route}$2`);
    }
    if(!out.includes('stamp-maple')){
      out=out.replace(/(<div class="stamp-country">CANADA<\/div>)/,'$1<div class="stamp-maple" aria-hidden="true">🍁</div>');
    }
    return out;
  }

  window.stampMarkup=function(e){return fixMarkup(originalMarkup(e),e)};

  if(typeof originalData==='function'){
    window.stampData=function(e){
      const data=originalData(e)||{};
      const resolved=resolvedStamp(e);
      if(!resolved)return data;
      return {
        ...data,
        country:'Canada',
        hero:'Canada',
        city:resolved.city||data.city,
        route:resolved.from&&resolved.to?`${resolved.from} → ${resolved.to}`:data.route
      };
    };
  }

  try{if(typeof renderStampBook==='function')renderStampBook()}catch{}
})();
