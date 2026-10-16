(()=>{
  const tabs=document.querySelector('.tabs');
  const content=document.getElementById('content');
  if(!tabs||!content||tabs.querySelector('[data-tab="app-users"]'))return;

  tabs.style.gridTemplateColumns='repeat(5,1fr)';
  const btn=document.createElement('button');
  btn.dataset.tab='app-users';
  btn.textContent='App Pilots';
  tabs.appendChild(btn);

  const style=document.createElement('style');
  style.textContent=`
    .app-pilot-card{cursor:pointer;transition:transform .15s ease,border-color .15s ease,background .15s ease}
    .app-pilot-card:hover{transform:translateY(-1px);border-color:#467594;background:#0d2132}
    .app-pilot-card:focus{outline:2px solid #4bb8ff;outline-offset:2px}
    .app-pilot-open{margin-top:10px;color:#74caff;font-size:10px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}
    .app-pilot-back{margin:0 0 12px;border:1px solid #38546a;background:#102439;color:#fff;border-radius:12px;padding:10px 13px;font-weight:900;cursor:pointer}
    .app-pilot-detail-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
    .app-pilot-detail-head h2{margin:0 0 4px}
    .app-pilot-detail-head p{margin:0;color:#8ea7bb;font-size:11px}
    .app-pilot-history{display:grid;gap:9px;margin-top:12px}
    .app-pilot-history-row{border:1px solid #254258;background:#0b1927;border-radius:14px;padding:12px}
    .app-pilot-history-row h3{margin:0 0 5px;font-size:13px}
    .app-pilot-history-row p{margin:0;color:#91a9bb;font-size:10px;line-height:1.45}
    .app-pilot-history-state{display:inline-block;margin-top:7px;padding:4px 7px;border-radius:999px;font-size:8px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;background:#13263a;color:#a8bfd0;border:1px solid #2d4d65}
    .app-pilot-history-state.ok{background:#153326;color:#70dea3;border-color:#28563f}
    .app-pilot-history-state.ready{background:#352b16;color:#ffd17c;border-color:#6a5525}
  `;
  document.head.appendChild(style);

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const when=v=>v?new Date(v).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}):'—';
  const pointsFor=m=>m>=120?300:m>=60?200:m>=30?100:0;
  let cachedRows=[];

  async function showPilot(pilot){
    content.innerHTML='<div class="empty">Loading pilot details…</div>';
    try{
      const r=await fetch('/api/admin/pilot-history',{cache:'no-store'});
      const history=await r.json();
      if(!r.ok)throw new Error(history?.error||'Could not load pilot details');
      const rows=(Array.isArray(history)?history:[])
        .filter(x=>String(x.userId||'')===String(pilot.userId||''))
        .sort((a,b)=>new Date(b.start||0)-new Date(a.start||0));
      const verified=rows.filter(x=>x.verified).length;
      const stamps=rows.filter(x=>x.claimed&&x.verified).length;
      const jp=rows.reduce((sum,x)=>sum+(x.verified?pointsFor(Number(x.attendanceMinutes||0)):0),0);
      content.innerHTML=`
        <button id="appPilotBack" class="app-pilot-back" type="button">← BACK TO APP PILOTS</button>
        <div class="card">
          <div class="app-pilot-detail-head">
            <div><h2>${esc(pilot.username||`Discord ${pilot.userId}`)}</h2><p>Discord ${esc(pilot.userId)}</p></div>
          </div>
          <div class="row"><span>First registered</span><strong>${esc(when(pilot.firstSeenAt))}</strong></div>
          <div class="row"><span>Last seen</span><strong>${esc(when(pilot.lastSeenAt))}</strong></div>
        </div>
        <div class="grid">
          <div class="card metric"><b>${rows.length}</b><span>Flight Records</span></div>
          <div class="card metric"><b>${verified}</b><span>Verified Flights</span></div>
          <div class="card metric"><b>${stamps}</b><span>Passport Stamps</span></div>
          <div class="card metric"><b>${jp}</b><span>Journey Points</span></div>
        </div>
        <div class="card"><h3 style="margin-top:0">Pilot Flight History</h3><div id="appPilotHistory" class="app-pilot-history"></div></div>`;
      document.getElementById('appPilotBack')?.addEventListener('click',()=>render(cachedRows));
      const box=document.getElementById('appPilotHistory');
      box.innerHTML=rows.length?rows.map(x=>{
        const mins=Number(x.attendanceMinutes||0);
        const spontaneous=String(x.eventId||'').startsWith('flying-now:');
        const state=x.claimed&&x.verified?'STAMP AWARDED':x.verified?'VERIFIED':'NOT VERIFIED';
        const cls=x.claimed&&x.verified?'ok':x.verified?'ready':'';
        return `<div class="app-pilot-history-row">
          <h3>${esc(x.eventName||x.eventId||'Flight')}</h3>
          <p>${spontaneous?'Spontaneous Flight':'Community Flight'} · ${esc(when(x.start))}</p>
          <p>${mins} min attendance · ${pointsFor(mins)} JP band</p>
          <span class="app-pilot-history-state ${cls}">${state}</span>
        </div>`;
      }).join(''):'<div class="empty">No flight history recorded for this pilot.</div>';
    }catch(e){content.innerHTML='<div class="card bad">'+esc(e.message)+'</div>'}
  }

  async function render(rowsOverride){
    content.innerHTML='<div class="empty">Loading registered pilots…</div>';
    try{
      let rows=rowsOverride;
      if(!Array.isArray(rows)){
        const r=await fetch('/api/admin/app-users',{cache:'no-store'});
        rows=await r.json();
        if(!r.ok)throw new Error(rows?.error||'Could not load registered pilots');
        cachedRows=rows;
      }
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
        box.innerHTML=filtered.length?filtered.map((x,i)=>`
          <div class="card item app-pilot-card" role="button" tabindex="0" data-pilot-index="${rows.indexOf(x)}" aria-label="Open details for ${esc(x.username||`Discord ${x.userId}`)}">
            <h3>${esc(x.username||`Discord ${x.userId}`)}</h3>
            <p>Discord ${esc(x.userId)}</p>
            <div class="row"><span>First registered</span><strong>${esc(when(x.firstSeenAt))}</strong></div>
            <div class="row"><span>Last seen</span><strong>${esc(when(x.lastSeenAt))}</strong></div>
            <div class="row"><span>Flight registrations</span><strong>${Number(x.flightRegistrations||0)}</strong></div>
            <div class="row"><span>Passport stamps</span><strong class="${Number(x.stamps||0)>0?'ok':''}">${Number(x.stamps||0)}</strong></div>
            <div class="app-pilot-open">View pilot details →</div>
          </div>`).join(''):'<div class="empty">No matching pilots.</div>';
        box.querySelectorAll('.app-pilot-card').forEach(card=>{
          const open=()=>showPilot(rows[Number(card.dataset.pilotIndex)]);
          card.addEventListener('click',open);
          card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
        });
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
