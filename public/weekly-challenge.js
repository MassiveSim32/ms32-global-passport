(()=>{
  const ID='ms32WeeklyChallenge';
  if(document.getElementById(ID))return;
  const home=document.getElementById('home');
  if(!home)return;
  const css=document.createElement('style');
  css.textContent=`
    #${ID}{margin:12px 0 18px;padding:16px;border:1px solid #b78a39;border-radius:18px;background:linear-gradient(140deg,#302719,#112b39 62%,#0a1925);color:#f5f8fb}
    #${ID} .wc-top{display:flex;justify-content:space-between;gap:10px;align-items:center}
    #${ID} .wc-eyebrow{font-size:10px;letter-spacing:.12em;font-weight:900;color:#ffcc7a;text-transform:uppercase}
    #${ID} .wc-points{padding:7px 10px;border-radius:20px;border:1px solid #b78a39;color:#ffcf84;font-weight:900;font-size:12px}
    #${ID} h2{font-size:19px;margin:10px 0 5px}
    #${ID} .wc-muted{font-size:12px;color:#bbcbda;line-height:1.5;margin:7px 0}
    #${ID} .wc-route{font-size:15px;font-weight:900;color:#fff;margin:9px 0}
    #${ID} .wc-status{font-size:11px;font-weight:800;color:#91e6b5;margin:11px 0 6px}
    #${ID} .wc-meter{height:9px;border-radius:99px;background:#233947;overflow:hidden}
    #${ID} .wc-meter span{display:block;height:100%;background:#58d697;transition:width .2s}
    #${ID} .wc-actions{display:grid;gap:8px;margin-top:13px}
    #${ID} .wc-btn{width:100%;padding:11px;border-radius:11px;border:1px solid #5d966f;background:#20533c;color:#fff;font-size:12px;font-weight:900;cursor:pointer}
    #${ID} .wc-btn.cancel{background:#3b2021;border-color:#a15b59;color:#ffd5d0}
    #${ID} .wc-link{display:block;text-align:center;color:#9ad5ff;font-size:12px;font-weight:800;padding:8px}
    #${ID} .wc-error{color:#ffc2b8;font-size:11px}
  `;
  document.head.appendChild(css);
  const card=document.createElement('section');card.id=ID;
  home.insertBefore(card,home.firstElementChild);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let busy=false,lastWeek='';
  async function request(path,method='GET'){
    const r=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:method==='GET'?{}:{'content-type':'application/json'}});
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(data.error||'Could not update weekly challenge');
    return data;
  }
  function draw(data){
    const c=data.challenge,s=data.status;
    const pct=s.completed?100:Math.max(0,Math.min(100,Math.round((s.attendanceMinutes||0)/30*100)));
    const status=s.completed?'CHALLENGE COMPLETE · 500 JP EARNED ✓':s.registered?(s.inVoice?'IN VOICE · TIMER RUNNING':'REGISTERED · WAITING FOR VOICE'):'NOT REGISTERED';
    card.innerHTML=`<div class="wc-top"><span class="wc-eyebrow">✈ MS32 Weekly Challenge</span><span class="wc-points">500 JP</span></div>
      <h2>${esc(c.title)}</h2><div class="wc-route">${esc(c.from)} → ${esc(c.to)}</div>
      <p class="wc-muted">${esc(c.brief)}</p><p class="wc-muted">Suggested aircraft: ${esc(c.aircraft)} · New challenge every Friday (Tasmania time).</p>
      <div class="wc-status">${esc(status)}</div>
      <div class="wc-muted">Voice attendance: ${Number(s.attendanceMinutes||0)} / 30 minutes</div>
      <div class="wc-meter"><span style="width:${pct}%"></span></div>
      <p class="wc-muted">Register first, then spend 30 minutes in the challenge voice channel. Flight completion is on the honour system. Reward is issued automatically once per week.</p>
      <div class="wc-actions">
      ${!s.registered&&!s.completed?'<button type="button" class="wc-btn" data-action="register">REGISTER FOR FLIGHT</button>':''}
      ${s.registered&&!s.completed?'<a class="wc-link" target="_blank" rel="noopener noreferrer" href="https://discord.com/channels/'+esc(c.guildId)+'/'+esc(c.channelId)+'">🎧 OPEN CHALLENGE VOICE CHANNEL ↗</a><button type="button" class="wc-btn cancel" data-action="cancel">✕ CANCEL FLIGHT</button>':''}
      </div><div class="wc-error" role="status"></div>`;
    card.querySelector('[data-action="register"]')?.addEventListener('click',()=>act('register'));
    card.querySelector('[data-action="cancel"]')?.addEventListener('click',()=>{if(confirm('Cancel your weekly challenge registration? Your attendance timer will be cleared and no JP awarded.'))act('cancel')});
  }
  async function act(action){
    if(busy)return;busy=true;
    const btn=card.querySelector('[data-action="'+action+'"]');if(btn)btn.disabled=true;
    try{draw(await request('/api/weekly-challenge/'+action,'POST'));window.dispatchEvent(new Event('ms32:weekly-challenge-updated'))}
    catch(e){const msg=card.querySelector('.wc-error');if(msg)msg.textContent=e.message;if(btn)btn.disabled=false}
    finally{busy=false}
  }
  async function refresh(){
    if(busy||document.hidden)return;
    try{const data=await request('/api/weekly-challenge');if(data.challenge.week!==lastWeek||!card.querySelector('button:focus'))draw(data);lastWeek=data.challenge.week}
    catch(e){if(!card.querySelector('.wc-top'))card.innerHTML='<div class="wc-eyebrow">✈ MS32 Weekly Challenge</div><p class="wc-muted">Challenge temporarily unavailable. Please refresh shortly.</p>'}
  }
  refresh();setInterval(refresh,15000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
})();