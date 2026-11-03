(()=>{
  const selector='#content';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dialog=document.createElement('dialog');
  dialog.id='ms32-registration-overlay';
  dialog.setAttribute('aria-labelledby','ms32-registration-overlay-title');
  dialog.style.cssText='width:min(540px,calc(100vw - 24px));max-height:85vh;overflow:auto;border:1px solid #31536d;border-radius:18px;padding:20px;background:#0d1b2b;color:#f5f8fb;box-shadow:0 22px 80px #000a';
  dialog.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:start"><h2 id="ms32-registration-overlay-title" style="margin:0 0 12px;font-size:19px">Event registrations</h2><form method="dialog"><button class="full" type="submit">Close ×</button></form></div><div id="ms32-registration-overlay-body"></div>';
  document.body.appendChild(dialog);
  const style=document.createElement('style');
  style.textContent='#ms32-registration-overlay::backdrop{background:#000b}.ms32-view-registrations{display:block;width:100%;margin-top:12px;cursor:pointer}';
  document.head.appendChild(style);
  let events=[],loading=false;
  async function apiGet(url){
    const res=await fetch(url,{credentials:'same-origin',cache:'no-store'});
    const data=await res.json();
    if(!res.ok)throw Error(data?.error||'Request failed');
    return data;
  }
  async function inject(){
    const tab=document.querySelector('.tabs button[data-tab="events"]');
    const root=document.querySelector(selector);
    if(!tab?.classList.contains('active')||!root||loading)return;
    const cards=[...root.querySelectorAll('.card.item')].filter(x=>x.querySelector('.eyebrow')?.textContent.includes('Discord Scheduled Event'));
    if(!cards.length)return;
    loading=true;
    try{
      events=await apiGet('/api/admin/events');
      if(!tab.classList.contains('active'))return;
      for(const card of cards){
        if(card.querySelector('.ms32-view-registrations')||card.querySelector('[data-event-index]'))continue;
        const title=card.querySelector('h3')?.textContent||'';
        const when=card.querySelector('p')?.textContent||'';
        const e=events.find(x=>x.name===title&&new Date(x.start).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})===when)||events.find(x=>x.name===title);
        if(!e)continue;
        const btn=document.createElement('button');
        btn.type='button';btn.className='full ms32-view-registrations';
        btn.textContent='View Registrations';
        btn.addEventListener('click',()=>open(e));
        card.appendChild(btn);
      }
    }catch(err){console.error('MS32 event registration button setup failed',err)}
    finally{loading=false}
  }
  async function open(event){
    dialog.querySelector('#ms32-registration-overlay-title').textContent=event.name||'Event registrations';
    const body=dialog.querySelector('#ms32-registration-overlay-body');
    body.innerHTML='<div class="empty">Loading registrations…</div>';
    dialog.showModal();
    try{
      const [live,persisted]=await Promise.all([apiGet('/api/admin/pilots'),apiGet('/api/admin/pilot-history').catch(()=>[])]);
      if(!dialog.open)return;
      const rows=new Map();
      for(const r of [...persisted,...live]){
        if(String(r.eventId)!==String(event.id))continue;
        const key=String(r.userId);
        const old=rows.get(key)||{};
        rows.set(key,{...old,...r,attendanceMinutes:Math.max(Number(old.attendanceMinutes||0),Number(r.attendanceMinutes||0)),verified:!!(old.verified||r.verified),claimed:!!(old.claimed||r.claimed),inVoice:!!(old.inVoice||r.inVoice)});
      }
      const pilots=[...rows.values()].sort((a,b)=>String(a.username||'').localeCompare(String(b.username||'')));
      body.innerHTML='<p class="muted">'+pilots.length+' registered pilot'+(pilots.length===1?'':'s')+'</p>'+(pilots.length?pilots.map(p=>'<div class="row" style="align-items:center"><div><strong>'+esc(p.username||p.userId)+'</strong><div class="muted" style="font-size:11px">'+Number(p.attendanceMinutes||0)+' min attendance</div></div><span class="pill">'+(p.claimed?'Stamped':p.verified?'Stamp ready':p.inVoice?'In voice':'Registered')+'</span></div>').join(''):'<div class="empty">No registrations recorded for this event.</div>');
    }catch(err){body.innerHTML='<div class="card bad">'+esc(err.message)+'</div>'}
  }
  const root=document.querySelector(selector);
  if(root){
    const observer=new MutationObserver(()=>{queueMicrotask(inject)});
    observer.observe(root,{childList:true,subtree:false});
  }
  document.querySelector('.tabs button[data-tab="events"]')?.addEventListener('click',()=>setTimeout(inject,0));
  setTimeout(inject,100);
})();