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

  function canadianIcaos(e){
    const text=`${e?.name||''} ${e?.description||''}`.toUpperCase();
    return text.match(/\bC[A-Z0-9]{3}\b/g)||[];
  }

  function fixMarkup(markup,e){
    const hits=canadianIcaos(e);
    if(!hits.length)return markup;
    const destination=hits[hits.length-1];
    let out=String(markup||'');
    out=out.replace(/(<div class="stamp-country">)[\s\S]*?(<\/div>)/,'$1CANADA$2');
    const city=cityByIcao[destination];
    if(city)out=out.replace(/(<div class="stamp-city">)[\s\S]*?(<\/div>)/,`$1${city}$2`);
    if(hits.length>=2){
      const route=`${hits[0]} → ${destination}`;
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
      const hits=canadianIcaos(e);
      if(!hits.length)return data;
      const destination=hits[hits.length-1];
      return {
        ...data,
        country:'Canada',
        hero:'Canada',
        city:cityByIcao[destination]||data.city,
        route:hits.length>=2?`${hits[0]} → ${destination}`:data.route
      };
    };
  }

  try{if(typeof renderStampBook==='function')renderStampBook()}catch{}
})();