(()=>{
  const CARD_ID='activeCommunityFlight';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct=(n,d)=>d>0?Math.max(0,Math.min(100,Math.round((n/d)*100))):0;

  function ensureStyles(){
    if(document.getElementById('activeCommunityFlightStyle'))return;
    const style=document.createElement('style');
    style.id='activeCommunityFlightStyle';
    style.textContent=`
      #${CARD_ID}{border-color:#2b8b62;background:radial-gradient(circle at top right,#174534,#0d2a22 54%,#091725);box-shadow:0 0 0 1px #45d18e22,0 14px 34px #0004}
      #${CARD_ID}.stamp-ready{border-color:#63e89b;box-shadow:0 0 0 1px #63e89b44,0 0 28px #45d18e22,0 14px 34px #0004}
      #${CARD_ID} .active-live{display:inline-flex;align-items:center;gap:7px;color:#7df0ae;font-size:10px;font-weight:900;letter-spacing:.11em;text-transform:uppercase}
      #${CARD_ID} .active-dot{width:8px;height:8px;border-radius:50%;background:#45d18e;box-shadow:0 0 0 4px #45d18e22;animation:ms32ActivePulse 1.8s ease-in-out infinite}
      #${CARD_ID} h2{margin:8px 0 4px;font-size:20px}
      #${CARD_ID} .active-copy{color:#b8c9c1;font-size:11px;line-height:1.45;margin:5px 0 10px}
      #${CARD_ID} .stamp-ready-banner{margin:10px 0;padding:11px 12px;border-radius:14px;background:#153326;border:1px solid #2f8659;color:#86f4b5;font-weight:900;text-align:center;letter-spacing:.08em;text-transform:uppercase}
      #${CARD_ID} .active-row{display:flex;justify-content:space-between;gap:12px;font-size:11px;padding:5px 0}
      #${CARD_ID} .active-row span{color:#95afa4}
      #${CARD_ID} .active-row strong{text-align:right;color:#fff}
      #${CARD_ID} .active-meter{height:9px;border-radius:99px;background:#102b23;overflow:hidden;margin-top:7px}
      #${CARD_ID} .active-meter i{display:block;height:100%;background:linear-gradient(90deg,#45d18e,#9af0bc);transition:width .35s ease}
      #${CARD_ID} .claim-error{margin-top:8px;color:#ffb0a3;font-size:10px;text-align:center}
      @keyframes ms32ActivePulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.78);opacity:.65}}
      @media(prefers-reduced-motion:reduce){#${CARD_ID} .active-dot{animation:none}}
    `;
    document.head.appendChild(style);
  }

  function removeCard(){document.getElementById(CARD_ID)?.remove()}

  async function claimStamp(eventId,button){
    const card=document.getElementById(CARD_ID);
    if(!eventId||!card)return;
    const oldText=button?.textContent||'CLAIM STAMP';
    if(button){button.disabled=true;button.textContent='CLAIMING…'}
    card.querySelector('.claim-error')?.remove();
    try{
      const r=await fetch(`/api/events/${encodeURIComponent(eventId)}/claim`,{method:'POST',cache:'no-store',credentials:'same-origin'});
      const data=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(data.error||'Could not claim stamp');
      await refresh();
      window.dispatchEvent(new Event('ms32:stamp-claimed'));
    }catch(e){
      if(button){button.disabled=false;button.textContent=oldText}
      const msg=document.createElement('div');
      msg.className='claim-error';
      msg.textContent=e?.message||'Could not claim stamp';
      card.appendChild(msg);
    }
  }

  function render(event,status){
    const next=document.getElementById('nextFlight');
    if(!next)return;
    ensureStyles();
    let card=document.getElementById(CARD_ID);
    if(!card){
      card=document.createElement('div');
      card.id=CARD_ID;
      card.className='hero';
      next.parentNode.insertBefore(card,next);
    }
    const attendance=Number(status.attendanceMinutes||0);
    const threshold=Number(status.thresholdMinutes||0);
    const verified=!!status.verified;
    const claimed=!!status.claimed;
    const progress=claimed||verified?100:pct(attendance,threshold);
    const voice=status.inVoice?'IN VOICE ✓':attendance>0?`WAITING · ${attendance} MIN BANKED`:'WAITING FOR VOICE';
    const state=claimed?'PASSPORT STAMPED ✓':verified?'Attendance complete — your Passport stamp is ready to claim.':'You’re registered for this flight. Your attendance progress is shown below.';
    card.classList.toggle('stamp-ready',verified&&!claimed);
    card.innerHTML=`
      <div class="active-live"><span class="active-dot"></span>Community flight in progress</div>
      <h2>${esc(event.name||'MS32 Community Flight')}</h2>
      <div class="active-copy">${esc(state)}</div>
      ${verified&&!claimed?'<div class="stamp-ready-banner">Passport Stamp Ready ✓</div>':''}
      <div class="active-row"><span>Voice status</span><strong>${esc(voice)}</strong></div>
      <div class="active-row"><span>Attendance</span><strong>${attendance}/${threshold||'—'} min</strong></div>
      <div class="active-meter"><i style="width:${progress}%"></i></div>
      ${claimed?'<button class="btn registered" type="button" onclick="showPage(\'passport\')">VIEW PASSPORT</button>':verified?'<button id="activeFlightClaimBtn" class="btn ready" type="button">CLAIM STAMP</button>':'<button class="btn ready" type="button" onclick="showPage(\'flights\')">VIEW FLIGHT</button>'}`;
    if(verified&&!claimed){
      const button=document.getElementById('activeFlightClaimBtn');
      button?.addEventListener('click',()=>claimStamp(event.id,button),{once:true});
    }
  }

  async function refresh(){
    try{
      const r=await fetch('/api/events/active',{cache:'no-store',credentials:'same-origin'});
      if(!r.ok){removeCard();return}
      const events=await r.json();
      if(!Array.isArray(events)||!events.length){removeCard();return}
      const event=events[0];
      const status=event?.statusInfo;
      if(status?.registered){render(event,status);return}
      removeCard();
    }catch{removeCard()}
  }

  const start=()=>{refresh();setInterval(refresh,15000)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
