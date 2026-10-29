(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .passport-stamp.arrival-stamp{
      --stamp-accent:#62d68a;
      --stamp-ink:#f5f8fb;
      --stamp-bg1:#0b4c93;
      --stamp-bg2:#073870;
      --stamp-bg3:#052d5d;
      position:relative;
      min-height:152px;
      border:3px solid rgba(245,248,251,.92);
      border-radius:18px;
      color:var(--stamp-ink);
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
        linear-gradient(145deg,var(--stamp-bg1),var(--stamp-bg2) 52%,var(--stamp-bg3));
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

    /* Airliner: clean international arrival / customs stamp */
    .passport-stamp.stamp-airliner{
      --stamp-bg1:#123f67;--stamp-bg2:#0a2b49;--stamp-bg3:#061f36;
      border-radius:14px;
      border-style:double;
      letter-spacing:.01em;
    }
    .passport-stamp.stamp-airliner:before{border-radius:9px;border-style:solid}
    .passport-stamp.stamp-airliner .stamp-family{letter-spacing:.28em;color:#9fd7ff}

    /* Warbirds: squadron / sortie feel */
    .passport-stamp.stamp-warbirds{
      --stamp-accent:#e0c174;--stamp-bg1:#53583d;--stamp-bg2:#353a2b;--stamp-bg3:#22271d;
      border-radius:8px;
      border-style:double;
      transform:rotate(-1deg);
      box-shadow:inset 0 0 0 2px rgba(231,220,181,.22),0 5px 12px rgba(0,0,0,.18);
    }
    .passport-stamp.stamp-warbirds:nth-child(even){transform:rotate(1deg)}
    .passport-stamp.stamp-warbirds:before{border-radius:4px;border-style:dashed}
    .passport-stamp.stamp-warbirds .stamp-family{font-weight:1000;letter-spacing:.2em;color:#f0d889}
    .passport-stamp.stamp-warbirds .stamp-country{font-family:Impact,Haettenschweiler,'Arial Narrow Bold',sans-serif;letter-spacing:.05em}

    /* Helicopter: technical rotor-ops badge */
    .passport-stamp.stamp-helicopter{
      --stamp-accent:#ffad59;--stamp-bg1:#134b52;--stamp-bg2:#0b343a;--stamp-bg3:#062429;
      border-radius:32px 10px 32px 10px;
      border-color:#79d7d2;
    }
    .passport-stamp.stamp-helicopter:before{border-radius:25px 7px 25px 7px;border-style:dashed}
    .passport-stamp.stamp-helicopter .stamp-family{color:#8ee7df;letter-spacing:.24em}

    /* Bush: rugged expedition / remote-strip stamp */
    .passport-stamp.stamp-bush{
      --stamp-accent:#f0bf63;--stamp-bg1:#5d6037;--stamp-bg2:#414526;--stamp-bg3:#2d311b;
      border-color:#e5d39b;
      border-radius:22% 9% 20% 10%;
      transform:rotate(-3deg);
      background:
        repeating-linear-gradient(17deg,rgba(255,255,255,.025) 0 1px,transparent 1px 7px),
        linear-gradient(145deg,var(--stamp-bg1),var(--stamp-bg2) 52%,var(--stamp-bg3));
    }
    .passport-stamp.stamp-bush:nth-child(even){transform:rotate(3deg)}
    .passport-stamp.stamp-bush:before{border-radius:18% 7% 17% 8%;border-style:dashed}
    .passport-stamp.stamp-bush .stamp-family{color:#f1d38a;letter-spacing:.18em}

    /* Spontaneous Flying: compact, worn red passport ink */
    .passport-stamp.stamp-spontaneous{
      --stamp-accent:#a51f2d;
      --stamp-ink:#a51f2d;
      width:92%;
      min-height:118px;
      margin:10px auto;
      padding:12px 9px 10px;
      border:3px double #a51f2d;
      border-radius:47% 43% 46% 42%;
      color:#a51f2d;
      background:
        radial-gradient(circle at 17% 24%,rgba(165,31,45,.13) 0 1px,transparent 2px),
        radial-gradient(circle at 73% 68%,rgba(165,31,45,.11) 0 1px,transparent 2px),
        repeating-linear-gradient(7deg,transparent 0 8px,rgba(165,31,45,.035) 9px 10px);
      background-size:13px 13px,17px 17px,auto;
      box-shadow:none;
      transform:rotate(-4deg);
      opacity:.92;
    }
    .passport-stamp.stamp-spontaneous:nth-child(even){transform:rotate(3deg)}
    .passport-stamp.stamp-spontaneous:before{inset:6px;border:1px dashed #a51f2d;border-radius:45% 41% 44% 40%;opacity:.62}
    .passport-stamp.stamp-spontaneous:after{
      background:
        linear-gradient(104deg,transparent 0 16%,rgba(239,231,210,.55) 17% 18%,transparent 19% 67%,rgba(239,231,210,.4) 68% 69%,transparent 70%),
        radial-gradient(circle at 32% 48%,rgba(239,231,210,.8) 0 1px,transparent 2px);
      background-size:auto,9px 9px;
      mix-blend-mode:normal;
      opacity:.42;
    }
    .passport-stamp.stamp-spontaneous .stamp-family{margin-top:0;font-size:7px;letter-spacing:.18em;color:#a51f2d}
    .passport-stamp.stamp-spontaneous .stamp-country{margin-top:6px;font-size:18px;color:#a51f2d;text-shadow:none}
    .passport-stamp.stamp-spontaneous .stamp-city{margin-top:4px;font-size:9px;letter-spacing:.13em;color:#a51f2d}
    .passport-stamp.stamp-spontaneous .stamp-date{margin-top:7px;font-size:7px;color:#a51f2d}
    .passport-stamp.stamp-spontaneous .stamp-series{margin-top:3px;font-size:5px;letter-spacing:.13em;color:#a51f2d;opacity:.82}
    .stamp-modal-card .passport-stamp.stamp-spontaneous{width:220px;min-height:150px;padding:16px 12px 13px;transform:rotate(-3deg)}
    .stamp-modal-card .passport-stamp.stamp-spontaneous .stamp-family{font-size:9px}
    .stamp-modal-card .passport-stamp.stamp-spontaneous .stamp-country{font-size:25px}
    .stamp-modal-card .passport-stamp.stamp-spontaneous .stamp-city{font-size:12px}
    .stamp-modal-card .passport-stamp.stamp-spontaneous .stamp-date{font-size:9px}
    .stamp-modal-card .passport-stamp.stamp-spontaneous .stamp-series{font-size:7px}

    /* Default community stamp keeps the established blue Passport style */
    .passport-stamp.stamp-community .stamp-family{color:#a9d9ff}

    .stamp-brand{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:5px;font-size:6px;font-weight:900;letter-spacing:.09em;color:#fff;opacity:.95}
    .stamp-brand img{width:16px;height:16px;border-radius:50%}
    .stamp-family{position:relative;z-index:1;margin-top:5px;font-size:6px;font-weight:900;letter-spacing:.3em;color:#fff;opacity:.96}
    .stamp-country{position:relative;z-index:1;color:var(--stamp-accent);font-size:19px;line-height:1;font-weight:1000;letter-spacing:.03em;margin-top:7px;max-width:100%;overflow-wrap:anywhere;text-shadow:0 1px 0 rgba(0,0,0,.2)}
    .stamp-city{position:relative;z-index:1;color:#fff;font-size:10px;font-weight:1000;letter-spacing:.2em;margin-top:5px;max-width:100%;overflow-wrap:anywhere}
    .stamp-route{position:relative;z-index:1;width:100%;margin-top:8px;padding-top:7px;border-top:1px solid rgba(245,248,251,.55);font-size:7px;font-weight:900;letter-spacing:.08em;color:#fff}
    .stamp-date{position:relative;z-index:1;font-size:8px;font-weight:1000;letter-spacing:.16em;color:#fff;margin-top:6px}
    .stamp-series{position:relative;z-index:1;font-size:5px;font-weight:900;letter-spacing:.09em;color:rgba(255,255,255,.72);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:95%}
    .stamp-modal-card{background:#e9e1cf}
    .stamp-modal-card .passport-stamp.arrival-stamp{width:280px;min-height:205px;margin:14px auto;padding:19px 18px 16px;border-width:4px;transform:rotate(-1deg)}
    .stamp-modal-card .passport-stamp.arrival-stamp .stamp-brand{font-size:8px}.stamp-modal-card .passport-stamp.arrival-stamp .stamp-brand img{width:24px;height:24px}
    .stamp-modal-card .passport-stamp.arrival-stamp .stamp-family{font-size:9px;margin-top:7px}
    .stamp-modal-card .passport-stamp.arrival-stamp .stamp-country{font-size:31px;margin-top:9px}
    .stamp-modal-card .passport-stamp.arrival-stamp .stamp-city{font-size:15px;margin-top:7px}
    .stamp-modal-card .passport-stamp.arrival-stamp .stamp-route{font-size:10px;margin-top:11px;padding-top:9px}
    .stamp-modal-card .passport-stamp.arrival-stamp .stamp-date{font-size:11px;margin-top:8px}
    .stamp-modal-card .passport-stamp.arrival-stamp .stamp-series{font-size:7px;margin-top:6px}
    .stamp-modal-card .passport-stamp.stamp-spontaneous{width:220px;min-height:150px;padding:16px 12px 13px;transform:rotate(-3deg)}
    .stamp-modal-card .passport-stamp.stamp-spontaneous .stamp-family{font-size:9px;margin-top:0}
    .stamp-modal-card .passport-stamp.stamp-spontaneous .stamp-country{font-size:25px;margin-top:7px}
    .stamp-modal-card .passport-stamp.stamp-spontaneous .stamp-city{font-size:12px;margin-top:5px}
    .stamp-modal-card .passport-stamp.stamp-spontaneous .stamp-date{font-size:9px;margin-top:8px}
    .stamp-modal-card .passport-stamp.stamp-spontaneous .stamp-series{font-size:7px;margin-top:4px}
    @media(max-width:520px){.passport-stamp.arrival-stamp{min-height:142px;padding:12px 8px 10px}.stamp-country{font-size:17px}.stamp-city{font-size:9px}.stamp-route{font-size:6px}.passport-stamp.stamp-spontaneous{min-height:112px;padding:10px 7px 9px}.passport-stamp.stamp-spontaneous .stamp-country{font-size:16px}}
  `;
  document.head.appendChild(style);

  const accentByCountry={
    'Ireland':'#75dd84','Australia':'#f3bf44','New Zealand':'#78c7ff','Japan':'#ff7d83','United States':'#ff8d6f','United Kingdom':'#86baff','France':'#72a9ff','Germany':'#f0c95b','Italy':'#72d69d','Spain':'#f5c94d','Portugal':'#73d19b','Netherlands':'#ff9f66','Canada':'#ff7777','Singapore':'#ff7f8e','South Korea':'#86c8ff','United Arab Emirates':'#72d4a2','South Africa':'#e2c76d','Brazil':'#7bd47c','Argentina':'#8ecfff','Chile':'#ff8a83','Mexico':'#77d18b'
  };

  const spontaneousCityByIcao={
    RPLL:'Manila',VVTS:'Ho Chi Minh City',VVNB:'Hanoi',WSSS:'Singapore',WMKK:'Kuala Lumpur',VTBS:'Bangkok',VHHH:'Hong Kong',RKSI:'Seoul',RJTT:'Tokyo',RJAA:'Tokyo',
    EGSU:'Duxford',YSSY:'Sydney',YMML:'Melbourne',YBBN:'Brisbane',YPAD:'Adelaide',YPPH:'Perth',YBCS:'Cairns',YMHB:'Hobart',YMLT:'Launceston',NZAA:'Auckland',NZWN:'Wellington',NZCH:'Christchurch',
    KJFK:'New York',KLAX:'Los Angeles',KSFO:'San Francisco',KSEA:'Seattle',KORD:'Chicago',KATL:'Atlanta',EGLL:'London',LFPG:'Paris',EDDF:'Frankfurt',EHAM:'Amsterdam',
    OMDB:'Dubai',OMAA:'Abu Dhabi',FAOR:'Johannesburg'
  };

  // Destination ICAO takes precedence for spontaneous flights; aircraft identifiers (e.g. C750) are not airports.
  const destinationByIcao={
    MBSC:['Turks and Caicos Islands','South Caicos'],LFLX:['France','Châteauroux'],EHRD:['Netherlands','Rotterdam'],ENZV:['Norway','Stavanger'],EKCH:['Denmark','Copenhagen'],EGLC:['United Kingdom','London'],EGPD:['United Kingdom','Aberdeen'],VTPM:['Thailand','Mae Sot'],
    EKHA:['Denmark','Haslev'],GCTS:['Spain','Tenerife'],LPMA:['Portugal','Funchal'],GMML:['Morocco','Laayoune'],TNCC:['Curaçao','Willemstad'],TNCM:['Sint Maarten','Philipsburg'],LPFR:['Portugal','Faro'],LEVT:['Spain','Vitoria-Gasteiz'],ENBR:['Norway','Bergen'],ENAL:['Norway','Ålesund'],EGQL:['United Kingdom','Leuchars'],LIBD:['Italy','Bari'],LKMT:['Czechia','Ostrava'],LSGG:['Switzerland','Geneva'],EFHK:['Finland','Helsinki'],EGBB:['United Kingdom','Birmingham'],HUKS:['Uganda','Kasese'],EDDB:['Germany','Berlin'],EPWA:['Poland','Warsaw'],MYSM:['Bahamas','San Salvador'],WSSS:['Singapore','Singapore'],VTBD:['Thailand','Bangkok'],EDDM:['Germany','Munich'],KDAB:['United States','Daytona Beach'],HBBA:['Burundi','Bujumbura'],LFSB:['France','Basel'],
  };

  const familyRules=[
    {family:'spontaneous',label:'SPONTANEOUS FLIGHT · MS32 VERIFIED',keywords:['flying now','spontaneous flight']},
    {family:'warbirds',label:'WARBIRDS · SORTIE VERIFIED',keywords:['warbird','warbirds','sortie','heritage flight','memorial flight','squadron']},
    {family:'helicopter',label:'HELICOPTER · ROTOR OPS',keywords:['helicopter','heli club','heli ','rotor','rotorcraft','chopper','rescue']},
    {family:'airliner',label:'AIRLINER · VERIFIED ARRIVAL',keywords:['airliner','world tour','airline','jetliner','commercial jet','awt']},
    {family:'bush',label:'BUSH FLIGHT · EXPEDITION VERIFIED',keywords:['bush','backcountry','outback','scenic','general aviation','ga flight','remote strip','island hop']}
  ];

  function stampFamily(e){
    if(String(e?.id||'').startsWith('flying-now:'))return{family:'spontaneous',label:'SPONTANEOUS FLIGHT · MS32 VERIFIED'};
    const hay=`${e?.name||''} ${e?.description||''}`.toLowerCase();
    for(const rule of familyRules){
      if(rule.keywords.some(k=>hay.includes(k)))return rule;
    }
    return {family:'community',label:'COMMUNITY FLIGHT · MS32 VERIFIED'};
  }

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

  function detectedRegion(e){
    const lower=`${e?.name||''} ${e?.description||''}`.toLowerCase();
    if(typeof REGION_COUNTRY!=='object'||!REGION_COUNTRY)return'';
    const keys=Object.keys(REGION_COUNTRY).sort((a,b)=>b.length-a.length);
    const hit=keys.find(region=>lower.includes(region));
    if(!hit)return'';
    if(hit==='act')return'ACT';
    return hit.replace(/\b\w/g,c=>c.toUpperCase());
  }

  function arrivalStampData(e){
    const series=typeof stampSeries==='function'?stampSeries(`${e?.name||''} ${e?.description||''}`):{label:'MASSIVE COMMUNITY FLIGHT'};
    const family=stampFamily(e);
    const loc=typeof locationInfo==='function'?locationInfo(e):{country:'',route:''};
    const route=typeof routeInfo==='function'?routeInfo(e):{route:'',destination:'',icaos:[]};
    const parenRoute=parentheticalRoute(e);
    const region=detectedRegion(e);
    const destinationIcao=Array.isArray(route.icaos)&&route.icaos.length?String(route.icaos[route.icaos.length-1]).toUpperCase():'';
    let country=normalCountry(loc?.country||'');
    if(destinationIcao&&typeof countryFromIcao==='function'&&(family.family==='spontaneous'||!country))country=normalCountry(countryFromIcao(destinationIcao))||country;
    const explicit=explicitDestination(e);
    const localFlight=String(e?.name||'').match(/^Flying Now · (?:LOCAL FLIGHT|TEST FLIGHT) to (.+?), (.+)$/i);
    if(localFlight)country=localFlight[2].trim();
    if(destinationIcao==='LSZH')country='Switzerland';
    if(family.family==='spontaneous'&&destinationByIcao[destinationIcao])country=destinationByIcao[destinationIcao][0];
    const cartagenaArrival=family.family==='airliner'&&/(?:SKCG|Cartagena)/i.test(`${e?.name||''} ${e?.description||''}`);
    if(cartagenaArrival)country='Colombia';
    const patagoniaHelicopter=String(e?.id||'')==='1560515159242571826';
    if(patagoniaHelicopter)country='Argentina';
    let city=family.family==='spontaneous'&&destinationIcao?spontaneousCityByIcao[destinationIcao]||'':'';
    if(destinationIcao==='LSZH')city='Zurich';
    if(family.family==='spontaneous'&&destinationByIcao[destinationIcao])city=destinationByIcao[destinationIcao][1];
    if(localFlight)city=localFlight[1].trim();
    if(cartagenaArrival)city='Cartagena';
    if(patagoniaHelicopter)city='Chile & Argentina';
    if(String(e?.id||'')==='1563385780074971236'||(/airliner thursday/i.test(String(e?.name||e?.title||''))&&/2026-10-29/.test(String(e?.start||e?.event_start||'')))){country='Australia';city='Brisbane';}
    // Happy Hour Fridays With Zed, 23 Oct 2026: verified destination.
    if(String(e?.id||'')==='1561332884265115738'){country='Japan';city='Toyama';}
    if(!city)city=cleanDestination(explicit,country);
    if(!city&&route?.destination&&!/^\w{4}$/.test(route.destination))city=cleanDestination(route.destination,country);
    if(!city&&country&&String(loc?.place||'').toLowerCase()!==country.toLowerCase())city=cleanDestination(loc.place,country);
    if(family.family==='spontaneous'&&!city&&destinationIcao)city=destinationIcao;
    let displayRoute='';
    if(Array.isArray(route.icaos)&&route.icaos.length>=2)displayRoute=`${route.icaos[0]} → ${route.icaos[1]}`;
    else if(parenRoute)displayRoute=`${parenRoute.from} → ${parenRoute.to}`;
    else displayRoute=route?.route||loc?.route||'COMMUNITY FLIGHT';
    if(patagoniaHelicopter)displayRoute='Chile → Argentina';
    const hero=country||'GLOBAL PASSPORT';
    const bushPlace=city||region||((!country&&loc?.place)?loc.place:'BUSH DESTINATION');
    const secondary=family.family==='bush'?bushPlace:(city||((!country&&loc?.place)?loc.place:'MS32 DESTINATION'));
    const accent=family.family==='spontaneous'?'#a51f2d':(accentByCountry[country]||'#63d6c4');
    return{
      hero:String(hero).toUpperCase(),
      city:String(secondary).toUpperCase(),
      route:String(displayRoute).toUpperCase(),
      date:typeof stampDate==='function'?stampDate(e?.start):'',
      series:series?.label||'MASSIVE COMMUNITY FLIGHT',
      accent,
      family:family.family,
      familyLabel:family.label
    };
  }

  window.stampData=function(e){return arrivalStampData(e)};
  window.stampMarkup=function(e){
    const s=arrivalStampData(e);
    if(s.family==='spontaneous'){
      return `<div class="passport-stamp arrival-stamp stamp-spontaneous"><div class="stamp-family">SPONTANEOUS FLIGHT</div><div class="stamp-country">${esc(s.hero)}</div><div class="stamp-city">${esc(s.city)}</div><div class="stamp-date">${esc(s.date)}</div><div class="stamp-series">MS32 VERIFIED</div></div>`;
    }
    const familyText={
      airliner:'AIRLINER · ARRIVED',
      warbirds:'WARBIRDS · SORTIE',
      helicopter:'HELICOPTER · ROTOR OPS',
      bush:'BUSH FLIGHT · EXPEDITION',
      community:'COMMUNITY FLIGHT'
    }[s.family]||'COMMUNITY FLIGHT';
    return `<div class="passport-stamp arrival-stamp stamp-${s.family}" style="--stamp-accent:${s.accent}"><div class="stamp-brand"><img src="/icon-192.png" alt=""><span>MS32 GLOBAL PASSPORT</span></div><div class="stamp-family">${esc(familyText)}</div><div class="stamp-country">${esc(s.hero)}</div><div class="stamp-city">${esc(s.city)}</div><div class="stamp-route">${esc(s.route)}</div><div class="stamp-date">${esc(s.date)}</div><div class="stamp-series">${esc(s.series)} · ${esc(s.familyLabel)}</div></div>`;
  };

  try{if(typeof renderStampBook==='function')renderStampBook()}catch{}
})();