(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .passport-stamp.arrival-stamp{
      --stamp-accent:#62d68a;
      position:relative;
      min-height:152px;
      border:3px solid rgba(245,248,251,.92);
      border-radius:18px;
      color:#f5f8fb;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      text-align:center;
      padding:14px 10px 12px;
      transform:rotate(-2deg);
      font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
      text-transform:uppercase;
      background:
        radial-gradient(circle at 20% 20%,rgba(255,255,255,.05) 0 1px,transparent 1.5px),
        linear-gradient(145deg,#0b4c93,#073870 52%,#052d5d);
      background-size:11px 11px,auto;
      box-shadow:inset 0 0 0 2px rgba(245,248,251,.25),0 5px 12px rgba(0,0,0,.14);
      overflow:hidden;
    }
    .passport-stamp.arrival-stamp:before{
      content:"";
      position:absolute;
      inset:6px;
      border:1px solid rgba(245,248,251,.72);
      border-radius:13px;
      opacity:.9;
      pointer-events:none;
    }
    .passport-stamp.arrival-stamp:after{
      content:"";
      position:absolute;
      inset:0;
      background:repeating-linear-gradient(13deg,transparent 0 9px,rgba(255,255,255,.025) 10px 11px);
      mix-blend-mode:screen;
      pointer-events:none;
    }
    .passport-stamp.arrival-stamp:nth-child(even){transform:rotate(2deg)}
    .stamp-brand{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:5px;font-size:6px;font-weight:900;letter-spacing:.09em;color:#fff;opacity:.95}
    .stamp-brand img{width:16px;height:16px;border-radius:50%}
    .stamp-arrived{position:relative;z-index:1;margin-top:5px;font-size:6px;font-weight:900;letter-spacing:.34em;color:#fff;opacity:.92}
    .stamp-country{position:relative;z-index:1;color:var(--stamp-accent);font-size:19px;line-height:1;font-weight:1000;letter-spacing:.03em;margin-top:7px;max-width:100%;overflow-wrap:anywhere;text-shadow:0 1px 0 rgba(0,0,0,.2)}
    .stamp-city{position:relative;z-index:1;color:#fff;font-size:10px;font-weight:1000;letter-spacing:.2em;margin-top:5px;max-width:100%;overflow-wrap:anywhere}
    .stamp-route{position:relative;z-index:1;width:100%;margin-top:8px;padding-top:7px;border-top:1px solid rgba(245,248,251,.55);font-size:7px;font-weight:900;letter-spacing:.08em;color:#fff}
    .stamp-date{position:relative;z-index:1;font-size:8px;font-weight:1000;letter-spacing:.16em;color:#fff;margin-top:6px}
    .stamp-series{position:relative;z-index:1;font-size:5px;font-weight:900;letter-spacing:.09em;color:rgba(255,255,255,.72);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:95%}
    .stamp-modal-card{background:#e9e1cf}
    .stamp-modal-card .passport-stamp.arrival-stamp{width:280px;min-height:205px;margin:14px auto;padding:19px 18px 16px;border-width:4px;transform:rotate(-1deg)}
    .stamp-modal-card .passport-stamp.arrival-stamp .stamp-brand{font-size:8px}.stamp-modal-card .passport-stamp.arrival-stamp .stamp-brand img{width:24px;height:24px}
    .stamp-modal-card .passport-stamp.arrival-stamp .stamp-arrived{font-size:9px;margin-top:7px}
    .stamp-modal-card .passport-stamp.arrival-stamp .stamp-country{font-size:31px;margin-top:9px}
    .stamp-modal-card .passport-stamp.arrival-stamp .stamp-city{font-size:15px;margin-top:7px}
    .stamp-modal-card .passport-stamp.arrival-stamp .stamp-route{font-size:10px;margin-top:11px;padding-top:9px}
    .stamp-modal-card .passport-stamp.arrival-stamp .stamp-date{font-size:11px;margin-top:8px}
    .stamp-modal-card .passport-stamp.arrival-stamp .stamp-series{font-size:7px;margin-top:6px}
    @media(max-width:520px){.passport-stamp.arrival-stamp{min-height:142px;padding:12px 8px 10px}.stamp-country{font-size:17px}.stamp-city{font-size:9px}.stamp-route{font-size:6px}}
  `;
  document.head.appendChild(style);

  const accentByCountry={
    'Ireland':'#75dd84','Australia':'#f3bf44','New Zealand':'#78c7ff','Japan':'#ff7d83','United States':'#ff8d6f','United Kingdom':'#86baff','France':'#72a9ff','Germany':'#f0c95b','Italy':'#72d69d','Spain':'#f5c94d','Portugal':'#73d19b','Netherlands':'#ff9f66','Canada':'#ff7777','Singapore':'#ff7f8e','South Korea':'#86c8ff','United Arab Emirates':'#72d4a2','South Africa':'#e2c76d','Brazil':'#7bd47c','Argentina':'#8ecfff','Chile':'#ff8a83','Mexico':'#77d18b'
  };

  function normalCountry(c){
    const x=String(c||'').trim();
    if(x==='USA')return'United States';
    if(x==='UAE')return'United Arab Emirates';
    if(x==='Korea')return'South Korea';
    if(['England','Scotland','Wales'].includes(x))return'United Kingdom';
    return x;
  }

  function parentheticalRoute(e){
    const name=String(e?.name||'');
    const match=name.match(/\(([^()]*)\)\s*$/);
    if(!match)return null;
    const route=match[1].match(/^\s*(.+?)\s+(?:to|→|->|–|—)\s+(.+?)\s*$/i);
    if(!route)return null;
    return {from:route[1].trim(),to:route[2].trim()};
  }

  function explicitDestination(e){
    const paren=parentheticalRoute(e);
    if(paren)return paren.to;
    const name=String(e?.name||'');
    const match=name.match(/(?:to|→|->|–|—)\s*([^|:—–]+)$/i);
    if(!match)return'';
    return match[1].replace(/[()]+$/g,'').trim();
  }

  function cleanDestination(raw,country){
    let s=String(raw||'').replace(/\([^)]*\)/g,' ').replace(/[()]/g,' ').trim();
    if(country){
      const variants=[country,country==='United States'?'USA':'',country==='United Arab Emirates'?'UAE':'',country==='United Kingdom'?'UK':''].filter(Boolean);
      for(const v of variants)s=s.replace(new RegExp(`(?:,|\\s)\\s*${v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*$`,'i'),'').trim();
    }
    s=s.replace(/\b[A-Z]{4}\b/g,' ').replace(/^[,\s-]+|[,\s-]+$/g,'').replace(/\s{2,}/g,' ').trim();
    return s;
  }

  function arrivalStampData(e){
    const series=typeof stampSeries==='function'?stampSeries(`${e?.name||''} ${e?.description||''}`):{label:'MASSIVE COMMUNITY FLIGHT'};
    const loc=typeof locationInfo==='function'?locationInfo(e):{country:'',route:''};
    const route=typeof routeInfo==='function'?routeInfo(e):{route:'',destination:'',icaos:[]};
    const parenRoute=parentheticalRoute(e);
    let country=normalCountry(loc?.country||'');
    if(!country&&Array.isArray(route.icaos)&&route.icaos.length&&typeof countryFromIcao==='function')country=normalCountry(countryFromIcao(route.icaos[route.icaos.length-1]));
    const explicit=explicitDestination(e);
    let city=cleanDestination(explicit,country);
    if(!city&&route?.destination&&!/^\w{4}$/.test(route.destination))city=cleanDestination(route.destination,country);
    if(!city&&country&&String(loc?.place||'').toLowerCase()!==country.toLowerCase())city=cleanDestination(loc.place,country);
    let displayRoute='';
    if(Array.isArray(route.icaos)&&route.icaos.length>=2)displayRoute=`${route.icaos[0]} → ${route.icaos[1]}`;
    else if(parenRoute)displayRoute=`${parenRoute.from} → ${parenRoute.to}`;
    else displayRoute=route?.route||loc?.route||'COMMUNITY FLIGHT';
    const hero=country||'GLOBAL PASSPORT';
    const secondary=city||((!country&&loc?.place)?loc.place:'MS32 DESTINATION');
    const accent=accentByCountry[country]||'#63d6c4';
    return{hero:String(hero).toUpperCase(),city:String(secondary).toUpperCase(),route:String(displayRoute).toUpperCase(),date:typeof stampDate==='function'?stampDate(e?.start):'',series:series?.label||'MASSIVE COMMUNITY FLIGHT',accent};
  }

  window.stampData=function(e){return arrivalStampData(e)};
  window.stampMarkup=function(e){
    const s=arrivalStampData(e);
    return `<div class="passport-stamp arrival-stamp" style="--stamp-accent:${s.accent}"><div class="stamp-brand"><img src="/icon-192.png" alt=""><span>MS32 GLOBAL PASSPORT</span></div><div class="stamp-arrived">ARRIVED</div><div class="stamp-country">${esc(s.hero)}</div><div class="stamp-city">${esc(s.city)}</div><div class="stamp-route">${esc(s.route)}</div><div class="stamp-date">${esc(s.date)}</div><div class="stamp-series">${esc(s.series)} · MS32 VERIFIED</div></div>`;
  };

  try{if(typeof renderStampBook==='function')renderStampBook()}catch{}
})();
