(()=>{
  const originalMarkup=window.stampMarkup;
  const originalData=window.stampData;
  if(typeof originalMarkup!=='function')return;

  const SPAIN_EVENTS=new Set([
    '1558597228065595504',
    'flying-now:2026-10-17:mvbzda9a:9abc7f'
  ]);

  function isSpainEvent(e){
    const id=String(e?.id||'');
    const text=`${e?.name||''} ${e?.description||''}`;
    return SPAIN_EVENTS.has(id) || /\bSpain\b/i.test(text);
  }

  function fixMarkup(markup,e){
    if(!isSpainEvent(e))return markup;
    return String(markup||'').replace(
      /(<div class="stamp-country">)[\s\S]*?(<\/div>)/,
      '$1SPAIN$2'
    );
  }

  window.stampMarkup=function(e){return fixMarkup(originalMarkup(e),e)};

  if(typeof originalData==='function'){
    window.stampData=function(e){
      const data=originalData(e)||{};
      if(!isSpainEvent(e))return data;
      return {...data,country:'Spain',hero:'Spain'};
    };
  }

  try{if(typeof renderStampBook==='function')renderStampBook()}catch{}
})();
