(()=>{
  const oldStampMarkup=window.stampMarkup;
  const oldStampData=window.stampData;
  if(typeof oldStampMarkup!=='function'||typeof oldStampData!=='function')return;

  const REGIONS=[
    'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming',
    'Tasmania','Victoria','New South Wales','Queensland','South Australia','Western Australia','Northern Territory','Australian Capital Territory','ACT',
    'Ontario','Quebec','British Columbia','Alberta','Manitoba','Saskatchewan','Nova Scotia','New Brunswick','Newfoundland and Labrador','Prince Edward Island',
    'Hokkaido','Okinawa'
  ].sort((a,b)=>b.length-a.length);

  const COUNTRY_RE=/^(usa|united states|us|u\.s\.|australia|canada|japan|new zealand|united kingdom|uk|england|scotland|wales|ireland|france|germany|italy|spain|portugal|netherlands|belgium|switzerland|austria|norway|sweden|finland|denmark|iceland|greece|turkey|singapore|malaysia|indonesia|thailand|vietnam|philippines|china|hong kong|south korea|korea|india|united arab emirates|uae|qatar|saudi arabia|south africa|brazil|argentina|chile|peru|mexico|venezuela)$/i;

  function textOf(e){return `${e?.name||''} ${e?.description||''}`;}
  function cleanBit(s){
    return String(s||'')
      .replace(/\([^)]*\)/g,' ')
      .replace(/\b(?:airliner|world tour|airline|community flight|flight|ms32|massive simulations 32|verified|arrival|arrived)\b/ig,' ')
      .replace(/\b[A-Z]{4}\b/g,' ')
      .replace(/^[\s|:;–—-]+|[\s|:;–—-]+$/g,'')
      .replace(/\s{2,}/g,' ')
      .trim();
  }

  function detectedRegion(e){
    const lower=textOf(e).toLowerCase();
    const hit=REGIONS.find(r=>lower.includes(r.toLowerCase()));
    return hit||'';
  }

  function commaLocation(raw){
    const bits=String(raw||'').split(',').map(cleanBit).filter(Boolean);
    if(bits.length<2)return'';
    const candidates=bits.filter(bit=>!COUNTRY_RE.test(bit)&&bit.length<=32&&!/[→>]/.test(bit));
    return candidates[candidates.length-1]||'';
  }

  function detectedPlace(e){
    const region=detectedRegion(e);
    if(region)return region;
    const fromName=commaLocation(e?.name||'');
    if(fromName)return fromName;
    const fromDescription=commaLocation(e?.description||'');
    if(fromDescription)return fromDescription;
    return'';
  }

  function normalCountryFromText(e,fallback){
    const lower=textOf(e).toLowerCase();
    const aliases=[
      [/\b(usa|united states|u\.s\.)\b/,'UNITED STATES'],
      [/\baustralia\b/,'AUSTRALIA'],[/\bnew zealand\b/,'NEW ZEALAND'],[/\bjapan\b/,'JAPAN'],[/\bcanada\b/,'CANADA'],
      [/\b(united kingdom|uk|england|scotland|wales)\b/,'UNITED KINGDOM'],[/\bireland\b/,'IRELAND'],[/\bfrance\b/,'FRANCE'],[/\bgermany\b/,'GERMANY'],[/\bitaly\b/,'ITALY'],[/\bspain\b/,'SPAIN'],[/\bportugal\b/,'PORTUGAL'],[/\bnetherlands\b/,'NETHERLANDS'],[/\bsingapore\b/,'SINGAPORE'],[/\bsouth korea\b/,'SOUTH KOREA'],[/\b(united arab emirates|uae)\b/,'UNITED ARAB EMIRATES'],[/\bsouth africa\b/,'SOUTH AFRICA'],[/\bbrazil\b/,'BRAZIL'],[/\bargentina\b/,'ARGENTINA'],[/\bchile\b/,'CHILE'],[/\bmexico\b/,'MEXICO'],[/\bvenezuela\b/,'VENEZUELA']
    ];
    for(const [re,label] of aliases)if(re.test(lower))return label;
    return String(fallback||'GLOBAL PASSPORT').toUpperCase();
  }

  function fixedAirlinerData(e){
    const s=oldStampData(e);
    if(String(e?.id||'')==='1563385780074971236'||(/airliner thursday/i.test(String(e?.name||e?.title||''))&&/2026-10-29/.test(String(e?.start||e?.event_start||''))))return {...s,hero:'AUSTRALIA',city:'BRISBANE'};
    if(s?.family!=='airliner')return s;
    const flightText=textOf(e);
    const eventDate=String(e?.start||e?.scheduled_start||'');
    const isCartagena=/(?:SKCG|Cartagena)/i.test(flightText)||(/2026-10-15/.test(eventDate)&&/(?:airliner|mini fly.in|world tour)/i.test(flightText));
    if(isCartagena)return {...s,hero:'COLOMBIA',city:'CARTAGENA'};
    const generic=/^(MS32 DESTINATION|GLOBAL PASSPORT|AIRLINER DESTINATION)$/i.test(String(s.city||''));
    const place=detectedPlace(e);
    return {
      ...s,
      hero:normalCountryFromText(e,s.hero),
      city:(generic&&place?place:s.city||place||'AIRLINER DESTINATION').toUpperCase()
    };
  }

  window.stampData=function(e){return fixedAirlinerData(e)};
  window.stampMarkup=function(e){
    const s=fixedAirlinerData(e);
    if(s?.family!=='airliner')return oldStampMarkup(e);
    return `<div class="passport-stamp arrival-stamp stamp-airliner" style="--stamp-accent:${s.accent}"><div class="stamp-brand"><img src="/icon-192.png" alt=""><span>MS32 GLOBAL PASSPORT</span></div><div class="stamp-family">AIRLINER · ARRIVED</div><div class="stamp-country">${esc(s.hero)}</div><div class="stamp-city">${esc(s.city)}</div><div class="stamp-route">${esc(s.route)}</div><div class="stamp-date">${esc(s.date)}</div><div class="stamp-series">${esc(s.series)} · ${esc(s.familyLabel||'AIRLINER · VERIFIED ARRIVAL')}</div></div>`;
  };

  try{if(typeof renderStampBook==='function')renderStampBook()}catch{}
})();
