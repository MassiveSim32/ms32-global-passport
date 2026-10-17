(()=>{
  const originalMarkup=window.stampMarkup;
  const originalData=window.stampData;
  if(typeof originalMarkup!=='function')return;

  const cityByIcao={
    CYYT:"St. John's",
    CYYG:'Charlottetown',
    CYQY:'Sydney'
  };

  function destinationIcao(e){
    const text=`${e?.name||''} ${e?.description||''}`.toUpperCase();
    const hits=text.match(/\bC[A-Z0-9]{3}\b/g)||[];
    return hits.length?hits[hits.length-1]:'';
  }

  function fixMarkup(markup,e){
    const icao=destinationIcao(e);
    if(!icao)return markup;
    let out=String(markup||'');
    out=out.replace(/(<div class="stamp-country">)[\s\S]*?(<\/div>)/,'$1CANADA$2');
    const city=cityByIcao[icao];
    if(city)out=out.replace(/(<div class="stamp-city">)[\s\S]*?(<\/div>)/,`$1${city}$2`);
    return out;
  }

  window.stampMarkup=function(e){return fixMarkup(originalMarkup(e),e)};

  if(typeof originalData==='function'){
    window.stampData=function(e){
      const data=originalData(e)||{};
      const icao=destinationIcao(e);
      if(!icao)return data;
      return {...data,country:'Canada',hero:'Canada',city:cityByIcao[icao]||data.city};
    };
  }
})();
