(()=>{
  const originalMarkup=window.stampMarkup;
  const originalData=window.stampData;
  if(typeof originalMarkup!=='function')return;

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
})();
