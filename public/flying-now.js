(()=>{
  const ACTIVE_KEY='ms32FlyingNowActive';
  const ACTIVE_MAX_AGE_MS=8*60*60*1000;
  const style=document.createElement('style');
  style.textContent=`
    .flying-now-card{border-color:#5d4520;background:radial-gradient(circle at top right,#4a2d12,#1c1a16 58%,#0b1725);position:relative;overflow:hidden}
    .flying-now-card:after{content:"✈";position:absolute;right:-8px;top:-20px;font-size:92px;opacity:.06;transform:rotate(-10deg);pointer-events:none}
    .flying-now-card h3{margin:5px 0 4px;font-size:18px}
    .flying-now-card p{margin:0;color:var(--muted);font-size:11px;line-height:1.45}
    .flying-now-meta{margin-top:8px;font-size:9px;letter-spacing:.06em;color:#cdbb9b;text-transform:uppercase}
    .flying-now-card.is-active{border-color:#2d7a50;background:radial-gradient(circle at top right,#173b2a,#11271e 58%,#0b1725)}
    .flying-now-card.is-active .flying-now-meta{color:#8ee7b3}
    .flying-now-card.is-active #flyingNowOpen{background:#218c58!important;border-color:#36b974!important;color:#fff!important;box-shadow:0 0 0 1px #51d58a44,0 8px 24px #0e6a3d44}
    .flying-now-active-line{display:none;margin-top:7px;font-size:10px;font-weight:800;color:#8ee7b3;letter-spacing:.03em}
    .flying-now-card.is-active .flying-now-active-line{display:block}
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
    .flying-now-status.err{border-color:#6b3734;background:#281614;color:#ffaaa0}
  `;
  document.head.appendChild(style);

  const home=document.getElementById('home');
  if(!home)return;
  const next=document.getElementById('nextFlight');
  const card=document.createElement('div');
  card.className='card flying-now-card';
  card.innerHTML=`<div class="eyebrow">Spontaneous flying</div><h3>Flying Now</h3><p>Heading up outside a scheduled event? Let other MS32 pilots know where you're going and what you're flying.</p><button class="btn primary" id="flyingNowOpen">✈ I'M FLYING NOW</button><div class="flying-now-active-line" id="flyingNowActiveLine">● PILOT ACTIVE</div><div class="flying-now-meta" id="flyingNowMeta">Posts to #champagne-chat · bonus stamp when verified in the approved MS32 comms channel</div>`;
  if(next?.parentNode)next.insertAdjacentElement('afterend',card); else home.appendChild(card);

  const modal=document.createElement('div');
  modal.className='flying-now-modal hidden';
  modal.id='flyingNowModal';
  modal.innerHTML=`<div class="flying-now-panel"><div class="eyebrow">MS32 Companion App</div><h2>I'm Flying Now</h2><p>Share an ad hoc flight with the community in #champagne-chat. Your Discord identity is added automatically.</p><label class="flying-now-field"><span>Departure</span><input id="flyingNowDeparture" maxlength="32" placeholder="E.G. KBOI"></label><label class="flying-now-field"><span>Destination</span><input id="flyingNowDestination" maxlength="32" placeholder="E.G. KMYL"></label><label class="flying-now-field"><span>Aircraft type</span><input id="flyingNowAircraft" maxlength="48" placeholder="E.G. CESSNA 208B"></label><div id="flyingNowStatus" class="flying-now-status">A bonus Passport stamp is only awarded when the pilot is detected in the configured Flying Now voice/comms channel.</div><button class="btn primary" id="flyingNowSubmit">POST TO DISCORD</button><button class="btn secondary" id="flyingNowClose">CANCEL</button></div>`;
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
  function close(){modal.classList.add('hidden')}
  function open(){modal.classList.remove('hidden');$('flyingNowDeparture')?.focus()}
  function loadActive(){
    try{
      const raw=localStorage.getItem(ACTIVE_KEY);
      if(!raw)return null;
      const data=JSON.parse(raw);
      if(!data?.activatedAt||Date.now()-Number(data.activatedAt)>ACTIVE_MAX_AGE_MS){localStorage.removeItem(ACTIVE_KEY);return null}
      return data;
    }catch{return null}
  }
  function renderActive(data){
    const btn=$('flyingNowOpen');
    const meta=$('flyingNowMeta');
    if(!btn||!meta)return;
    if(data){
      card.classList.add('is-active');
      btn.textContent='✓ PILOT ACTIVE';
      meta.textContent=`${data.departure} → ${data.destination} · ${data.aircraft}`;
    }else{
      card.classList.remove('is-active');
      btn.textContent="✈ I'M FLYING NOW";
      meta.textContent='Posts to #champagne-chat · bonus stamp when verified in the approved MS32 comms channel';
    }
  }
  function setActive(departure,destination,aircraft){
    const data={departure,destination,aircraft,activatedAt:Date.now()};
    try{localStorage.setItem(ACTIVE_KEY,JSON.stringify(data))}catch{}
    renderActive(data);
  }
  $('flyingNowOpen')?.addEventListener('click',open);
  $('flyingNowClose')?.addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close()});

  async function mergeBonusStamps(){
    try{
      const r=await fetch('/api/flying-now/stamps',{credentials:'same-origin'});
      if(!r.ok)return;
      const d=await r.json();
      if(!Array.isArray(d.stamps)||typeof allEvents==='undefined'||typeof statuses==='undefined')return;
      let changed=false;
      for(const x of d.stamps){
        if(!allEvents.some(e=>e.id===x.event.id)){allEvents.push(x.event);changed=true}
        statuses[x.event.id]=x.status;
      }
      if(changed||d.stamps.length){
        try{if(typeof renderStampBook==='function')renderStampBook()}catch{}
        const count=document.getElementById('stampCount');
        if(count)count.textContent=String(allEvents.filter(e=>statuses[e.id]?.claimed).length);
      }
    }catch{}
  }

  $('flyingNowSubmit')?.addEventListener('click',async()=>{
    const departure=String($('flyingNowDeparture')?.value||'').trim().toUpperCase();
    const destination=String($('flyingNowDestination')?.value||'').trim().toUpperCase();
    const aircraft=String($('flyingNowAircraft')?.value||'').trim().toUpperCase();
    const status=$('flyingNowStatus');
    const btn=$('flyingNowSubmit');
    if(!departure||!destination||!aircraft){
      status.className='flying-now-status err';status.textContent='Please enter departure, destination and aircraft type.';return;
    }
    btn.disabled=true;btn.textContent='POSTING…';
    status.className='flying-now-status';status.textContent='Posting your flight to #champagne-chat…';
    try{
      const r=await fetch('/api/flying-now',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',body:JSON.stringify({departure,destination,aircraft})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d.error||'Could not post flight');
      setActive(departure,destination,aircraft);
      status.className='flying-now-status ok';
      status.textContent=d.stampAwarded?'Posted to #champagne-chat — bonus Flying Now stamp added to your Passport.':'Posted to #champagne-chat successfully. '+(d.bonusReason||'');
      if(d.stampAwarded)await mergeBonusStamps();
      btn.textContent='ACTIVE ✓';
      setTimeout(()=>{close();btn.disabled=false;btn.textContent='POST TO DISCORD'},1200);
    }catch(err){
      status.className='flying-now-status err';status.textContent=err.message||'Could not post flight';
      btn.disabled=false;btn.textContent='POST TO DISCORD';
    }
  });

  renderActive(loadActive());
  setTimeout(mergeBonusStamps,1200);
})();
