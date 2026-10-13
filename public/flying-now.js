(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .flying-now-card{border-color:#5d4520;background:radial-gradient(circle at top right,#4a2d12,#1c1a16 58%,#0b1725);position:relative;overflow:hidden}
    .flying-now-card:after{content:"✈";position:absolute;right:-8px;top:-20px;font-size:92px;opacity:.06;transform:rotate(-10deg);pointer-events:none}
    .flying-now-card h3{margin:5px 0 4px;font-size:18px}
    .flying-now-card p{margin:0;color:var(--muted);font-size:11px;line-height:1.45}
    .flying-now-meta{margin-top:8px;font-size:9px;letter-spacing:.06em;color:#cdbb9b;text-transform:uppercase}
    .flying-now-card.is-pending{border-color:#8a6629;background:radial-gradient(circle at top right,#3e2d12,#211c13 58%,#0b1725)}
    .flying-now-card.is-pending .flying-now-meta{color:#ffd27a}
    .flying-now-card.is-active{border-color:#2d7a50;background:radial-gradient(circle at top right,#173b2a,#11271e 58%,#0b1725)}
    .flying-now-card.is-active .flying-now-meta{color:#8ee7b3}
    .flying-now-card.is-active #flyingNowOpen{background:#218c58!important;border-color:#36b974!important;color:#fff!important;box-shadow:0 0 0 1px #51d58a44,0 8px 24px #0e6a3d44}
    .flying-now-active-line{display:none;margin-top:7px;font-size:10px;font-weight:800;color:#8ee7b3;letter-spacing:.03em}
    .flying-now-card.is-active .flying-now-active-line{display:block}
    .flying-now-auto-finish{display:none;margin-top:7px;font-size:9px;line-height:1.4;color:#a8cbb8;text-transform:uppercase;letter-spacing:.04em}
    .flying-now-card.is-active .flying-now-auto-finish{display:block}
    #nextFlight.pilot-flight-active{border-color:#2d7a50;background:radial-gradient(circle at top right,#19452e,#11271e 58%,#0b1725);box-shadow:0 0 0 1px #51d58a33,0 12px 30px #0e6a3d33}
    #nextFlight.pilot-flight-active .eyebrow{color:#8ee7b3}
    #nextFlight.pilot-flight-active .route{color:#8ee7b3}
    .pilot-home-live{display:inline-block;margin:4px 0 7px;padding:6px 9px;border-radius:999px;background:#153326;border:1px solid #28563f;color:#8ee7b3;font-size:9px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}
    .flying-now-modal{position:fixed;inset:0;background:#02070ddd;display:grid;place-items:center;padding:20px;z-index:120}
    .flying-now-panel{width:min(390px,95vw);background:#0c1a28;border:1px solid #31506a;border-radius:24px;padding:20px;box-shadow:0 24px 70px #000b}
    .flying-now-panel h2{margin:4px 0 6px;font-size:22px}
    .flying-now-panel p{margin:0 0 14px;color:var(--muted);font-size:11px;line-height:1.45}
    .flying-now-field{display:block;margin-top:11px}
    .flying-now-field span{display:block;font-size:9px;font-weight:900;letter-spacing:.1em;color:#9bb5c9;text-transform:uppercase;margin-bottom:5px}
    .flying-now-field input{width:100%;border:1px solid #29475f;background:#07131f;color:#fff;border-radius:13px;padding:12px 13px;font:inherit;outline:none;text-transform:uppercase}
    .flying-now-field input:focus{border-color:var(--orange);box-shadow:0 0 0 2px #ff9f2f22}
    .flying-now-status{margin-top:12px;padding:10px 11px;border-radius:12px;background:#081521;border:1px solid #1e394e;color:#b8ccdc;font-size:10px;line-height:1.4}
    .flying-now-status.ok{border-color:#28563f;background:#112b21;color:#83e6af}
    .flying-now-status.waiting{border-color:#735829;background:#2a2112;color:#ffd27a}
    .flying-now-status.err{border-color:#6b3734;background:#281614;color:#ffaaa0}
  `;
  document.head.appendChild(style);

  const home=document.getElementById('home');
  if(!home)return;
  const next=document.getElementById('nextFlight');
  const card=document.createElement('div');
  card.className='card flying-now-card';
  card.innerHTML=`<div class="eyebrow">Spontaneous flying</div><h3>Flying Now</h3><p>Heading up outside a scheduled event? Let other MS32 pilots know where you're going and what you're flying.</p><button class="btn primary" id="flyingNowOpen">✈ I'M FLYING NOW</button><div class="flying-now-active-line" id="flyingNowActiveLine">● PILOT ACTIVE · EARNING JOURNEY POINTS</div><div class="flying-now-auto-finish">Your flight will finish automatically when you leave Champagne Voice.</div><div class="flying-now-meta" id="flyingNowMeta">Posts to #champagne-chat · join Champagne Voice to earn Journey Points</div>`;
  if(next?.parentNode)next.insertAdjacentElement('afterend',card); else home.appendChild(card);

  const modal=document.createElement('div');
  modal.className='flying-now-modal hidden';
  modal.id='flyingNowModal';
  modal.innerHTML=`<div class="flying-now-panel"><div class="eyebrow">MS32 Companion App</div><h2>I'm Flying Now</h2><p>Share an ad hoc flight with the community in #champagne-chat. Your Discord identity is added automatically.</p><label class="flying-now-field"><span>Departure</span><input id="flyingNowDeparture" maxlength="32" placeholder="E.G. KBOI"></label><label class="flying-now-field"><span>Destination</span><input id="flyingNowDestination" maxlength="32" placeholder="E.G. KMYL"></label><label class="flying-now-field"><span>Aircraft type</span><input id="flyingNowAircraft" maxlength="48" placeholder="E.G. CESSNA 208B"></label><div id="flyingNowStatus" class="flying-now-status">Post your flight, then join the Champagne Voice Channel to activate it and start earning Journey Points.</div><button class="btn primary" id="flyingNowSubmit">POST TO DISCORD</button><button class="btn secondary" id="flyingNowClose">CANCEL</button></div>`;
  document.body.appendChild(modal);

  const $=id=>document.getElementById(id);
  ['flyingNowDeparture','flyingNowDestination','flyingNowAircraft'].forEach(id=>{
    $(id)?.addEventListener('input',e=>{
      const el=e.currentTarget;
      const start=el.selectionStart;
      const end=el.selectionEnd;
      el.value=el.value.toUpperCase();
      try{el.setSelectionRange(start,end)}catch{}
    });
  });

  let lastServerState='idle';
  let lastFlyingNowData={state:'idle'};
  let baseUpdateDashboard=null;

  function safeText(v){
    if(typeof esc==='function')return esc(String(v??''));
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function activeScheduledFlight(){
    try{
      return (Array.isArray(allEvents)?allEvents:[]).find(e=>
        !String(e?.id||'').startsWith('flying-now:')&&statuses?.[e.id]?.registered&&statuses?.[e.id]?.inVoice
      )||null;
    }catch{return null}
  }

  function renderHomeFlight(data=lastFlyingNowData,restore=true){
    const host=document.getElementById('nextFlight');
    if(!host)return false;

    if(data?.state==='active'){
      host.classList.add('pilot-flight-active');
      const mins=Number(data.attendanceMinutes||0);
      const pts=Number(data.points||0);
      host.innerHTML=`<div class="eyebrow">Active flight</div><div class="pilot-home-live">● PILOT ACTIVE · IN CHAMPAGNE VOICE</div><h2>Flying Now</h2><div class="route">${safeText(data.departure||'')} → ${safeText(data.destination||'')}</div><div class="sub">${safeText(data.aircraft||'Aircraft')} · ${mins} min comms · ${pts} Journey Points</div>`;
      return true;
    }

    const scheduled=activeScheduledFlight();
    if(scheduled){
      const s=statuses[scheduled.id]||{};
      host.classList.add('pilot-flight-active');
      host.innerHTML=`<div class="eyebrow">Active community flight</div><div class="pilot-home-live">● PILOT ACTIVE · IN EVENT COMMS</div><h2>${safeText(scheduled.name)}</h2>${typeof eventTimes==='function'?eventTimes(scheduled.start):''}<div class="sub" style="margin-top:8px">${Number(s.attendanceMinutes||0)}/${Number(s.thresholdMinutes||30)} min verified comms · Journey Points tracking active</div><button class="btn ready" onclick="showPage('flights')">VIEW ACTIVE FLIGHT</button>`;
      return true;
    }

    const wasActive=host.classList.contains('pilot-flight-active');
    host.classList.remove('pilot-flight-active');
    if(wasActive&&restore&&baseUpdateDashboard)baseUpdateDashboard();
    return false;
  }

  function close(){modal.classList.add('hidden')}
  function open(){
    if(lastServerState==='pending'||lastServerState==='active')return;
    modal.classList.remove('hidden');
    $('flyingNowDeparture')?.focus();
  }

  function renderState(data){
    const btn=$('flyingNowOpen');
    const meta=$('flyingNowMeta');
    if(!btn||!meta)return;
    lastFlyingNowData=data||{state:'idle'};
    const state=data?.state||'idle';
    lastServerState=state;
    card.classList.toggle('is-pending',state==='pending');
    card.classList.toggle('is-active',state==='active');

    if(state==='pending'){
      btn.disabled=true;
      btn.textContent='⏳ WAITING FOR VOICE';
      meta.textContent='JOIN THE CHAMPAGNE VOICE CHANNEL TO START EARNING JOURNEY POINTS';
      return;
    }
    if(state==='active'){
      btn.disabled=true;
      btn.textContent='✓ PILOT ACTIVE';
      const mins=Number(data.attendanceMinutes||0);
      const pts=Number(data.points||0);
      meta.textContent=`${data.departure||''} → ${data.destination||''} · ${data.aircraft||''} · ${mins} MIN · ${pts} JOURNEY POINTS`;
      return;
    }
    btn.disabled=false;
    btn.textContent="✈ I'M FLYING NOW";
    meta.textContent='Posts to #champagne-chat · join Champagne Voice to earn Journey Points';
  }

  function mergeJourneyStatuses(data){
    if(typeof statuses!=='object'||!statuses)return;
    for(const x of (Array.isArray(data?.history)?data.history:[])){
      if(!x?.eventId)continue;
      statuses[x.eventId]={registered:true,attendanceMinutes:Number(x.attendanceMinutes||0),thresholdMinutes:30,verified:!!x.verified,claimed:!!x.claimed,inVoice:!!x.inVoice};
    }
  }

  async function mergeBonusStamps(){
    try{
      const r=await fetch('/api/flying-now/stamps',{credentials:'same-origin',cache:'no-store'});
      if(!r.ok)return;
      const d=await r.json();
      if(!Array.isArray(d.stamps)||typeof allEvents==='undefined'||typeof statuses==='undefined')return;
      let changed=false;
      for(const x of d.stamps){
        const journey=statuses[x.event.id];
        const existing=allEvents.findIndex(e=>e.id===x.event.id);
        if(journey?.registered&&!journey.verified){
          if(existing>=0){allEvents.splice(existing,1);changed=true}
          continue;
        }
        if(existing<0){allEvents.push(x.event);changed=true}
        if(!journey?.registered)statuses[x.event.id]=x.status;
      }
      if(changed||d.stamps.length){
        try{if(typeof renderStampBook==='function')renderStampBook()}catch{}
        const count=document.getElementById('stampCount');
        if(count)count.textContent=String(allEvents.filter(e=>statuses[e.id]?.claimed).length);
      }
    }catch{}
  }

  async function syncStatus(){
    try{
      const r=await fetch('/api/flying-now/status',{credentials:'same-origin',cache:'no-store'});
      if(!r.ok)return;
      const d=await r.json();
      lastFlyingNowData=d;
      mergeJourneyStatuses(d);
      renderState(d);
      await mergeBonusStamps();
      renderHomeFlight(d);
    }catch{}
  }

  $('flyingNowOpen')?.addEventListener('click',open);
  $('flyingNowClose')?.addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close()});

  $('flyingNowSubmit')?.addEventListener('click',async()=>{
    const departure=String($('flyingNowDeparture')?.value||'').trim().toUpperCase();
    const destination=String($('flyingNowDestination')?.value||'').trim().toUpperCase();
    const aircraft=String($('flyingNowAircraft')?.value||'').trim().toUpperCase();
    const status=$('flyingNowStatus');
    const btn=$('flyingNowSubmit');
    if(!departure||!destination||!aircraft){status.className='flying-now-status err';status.textContent='Please enter departure, destination and aircraft type.';return}
    btn.disabled=true;btn.textContent='POSTING…';
    status.className='flying-now-status';status.textContent='Posting your flight to #champagne-chat…';
    try{
      const r=await fetch('/api/flying-now',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({departure,destination,aircraft})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||'Could not post flight');
      const immediate={state:d.voiceEligible?'active':'pending',departure,destination,aircraft,attendanceMinutes:0,points:0};
      renderState(immediate);
      renderHomeFlight(immediate);
      status.className=d.voiceEligible?'flying-now-status ok':'flying-now-status waiting';
      status.textContent=d.voiceEligible?'Flight active — Journey Points are earning now. Your flight will finish automatically when you leave Champagne Voice.':'Join the Champagne Voice Channel to start earning Journey Points.';
      btn.textContent=d.voiceEligible?'ACTIVE ✓':'POSTED ✓';
      setTimeout(()=>{close();btn.disabled=false;btn.textContent='POST TO DISCORD';syncStatus()},2200);
    }catch(err){
      status.className='flying-now-status err';status.textContent=err.message||'Could not post flight';
      btn.disabled=false;btn.textContent='POST TO DISCORD';
    }
  });

  baseUpdateDashboard=typeof updateDashboard==='function'?updateDashboard:null;
  if(baseUpdateDashboard){
    updateDashboard=async function(){
      const result=await baseUpdateDashboard.apply(this,arguments);
      renderHomeFlight(lastFlyingNowData,false);
      await syncStatus();
      return result;
    };
  }

  renderState({state:'idle'});
  setTimeout(()=>{syncStatus()},800);
  setInterval(syncStatus,3000);
})();