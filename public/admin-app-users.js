(()=>{
  const tabs=document.querySelector('.tabs');
  const content=document.getElementById('content');
  if(!tabs||!content||tabs.querySelector('[data-tab="app-users"]'))return;

  tabs.style.gridTemplateColumns='repeat(5,1fr)';
  const btn=document.createElement('button');
  btn.dataset.tab='app-users';
  btn.textContent='App Pilots';
  tabs.appendChild(btn);

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const when=v=>v?new Date(v).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}):'—';

  async function render(){
    content.innerHTML='<div class="empty">Loading registered pilots…</div>';
    try{
      const r=await fetch('/api/admin/app-users',{cache:'no-store'});
      const rows=await r.json();
      if(!r.ok)throw new Error(rows?.error||'Could not load registered pilots');
      content.innerHTML=`
        <div class="grid">
          <div class="card metric"><b>${rows.length}</b><span>Companion App Pilots</span></div>
          <div class="card metric"><b>${rows.filter(x=>Number(x.flightRegistrations||0)>0).length}</b><span>With Flight Registrations</span></div>
        </div>
        <input id="appPilotSearch" class="search" placeholder="Search pilot or Discord ID…">
        <div id="appPilotRows"></div>`;
      const search=document.getElementById('appPilotSearch');
      const box=document.getElementById('appPilotRows');
      const draw=()=>{
        const q=search.value.trim().toLowerCase();
        const filtered=rows.filter(x=>`${x.username||''} ${x.userId||''}`.toLowerCase().includes(q));
        box.innerHTML=filtered.length?filtered.map(x=>`
          <div class="card item">
            <h3>${esc(x.username||`Discord ${x.userId}`)}</h3>
            <p>Discord ${esc(x.userId)}</p>
            <div class="row"><span>First registered</span><strong>${esc(when(x.firstSeenAt))}</strong></div>
            <div class="row"><span>Last seen</span><strong>${esc(when(x.lastSeenAt))}</strong></div>
            <div class="row"><span>Flight registrations</span><strong>${Number(x.flightRegistrations||0)}</strong></div>
            <div class="row"><span>Passport stamps</span><strong class="${Number(x.stamps||0)>0?'ok':''}">${Number(x.stamps||0)}</strong></div>
          </div>`).join(''):'<div class="empty">No matching pilots.</div>';
      };
      search.addEventListener('input',draw);
      draw();
    }catch(e){content.innerHTML='<div class="card bad">'+esc(e.message)+'</div>'}
  }

  btn.addEventListener('click',()=>{
    document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('active',x===btn));
    render();
  });
})();
