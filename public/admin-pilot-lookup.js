(()=>{
  function renderPilotCard(p){
    const remaining=p.tier.next?Math.max(0,p.tier.next.min-p.points):0;
    const historyId=`history-${p.userId}`;
    return `
      <div class="card item">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
          <div><h3 style="margin-bottom:2px">${esc(p.username)}</h3><p style="margin-top:0">Discord ${esc(p.userId)}</p></div>
          <strong class="${p.inVoice?'ok':''}">${p.inVoice?'IN VOICE ✓':''}</strong>
        </div>
        <div class="row"><span>Frequent Flyer</span><strong>${esc(p.tier.current.name)} · ${p.points.toLocaleString()} pts</strong></div>
        <div style="height:8px;background:#142536;border:1px solid #2b4355;border-radius:99px;overflow:hidden;margin:8px 0 5px"><i style="display:block;height:100%;width:${p.tier.pct}%;background:linear-gradient(90deg,#ff9f2f,#ffd27a)"></i></div>
        <p>${p.tier.next?`${remaining.toLocaleString()} pts to ${esc(p.tier.next.name)}`:'Top tier achieved'}</p>
        <div class="row"><span>Passport stamps</span><strong class="ok">${p.stamps}</strong></div>
        <div class="row"><span>Verified flights</span><strong>${p.verifiedFlights}</strong></div>
        <div class="row"><span>Verified comms</span><strong>${fmtMinutes(p.minutes)}</strong></div>
        <button class="full" data-history="${historyId}" style="margin-top:10px">View flight history</button>
        <div id="${historyId}" style="display:none;margin-top:10px">
          ${p.rows.slice().sort((a,b)=>new Date(b.start||0)-new Date(a.start||0)).map((r)=>`
            <div style="border-top:1px solid #193247;padding:10px 0">
              <strong>${esc(r.eventName)}</strong>
              <p>${esc(fmt(r.start))}</p>
              <div class="row"><span>Attendance</span><strong>${r.attendanceMinutes} min</strong></div>
              <div class="row"><span>Points</span><strong>${pointsFor(r)} pts</strong></div>
              <div class="row"><span>Passport</span><strong class="${r.claimed?'ok':r.verified?'warn':''}">${r.claimed?'STAMPED ✓':r.verified?'STAMP READY':'Tracking'}</strong></div>
              <div class="actions">
                <button data-adjust data-user="${esc(r.userId)}" data-event="${esc(r.eventId)}">Adjust time</button>
                <button data-stamp data-user="${esc(r.userId)}" data-event="${esc(r.eventId)}" data-action="${r.claimed?'revoke':'award'}" class="${r.claimed?'revoke':'award'}">${r.claimed?'Revoke stamp':'Award stamp'}</button>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  function currentRegistrationCard(p){
    const rows=p.rows.slice().sort((a,b)=>new Date(a.start||0)-new Date(b.start||0));
    return `
      <div class="card item">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
          <div><h3 style="margin-bottom:2px">${esc(p.username)}</h3><p style="margin-top:0">Discord ${esc(p.userId)}</p></div>
          <strong class="${p.inVoice?'ok':''}">${p.inVoice?'IN VOICE ✓':'REGISTERED'}</strong>
        </div>
        ${rows.map(r=>`<div style="border-top:1px solid #193247;padding:10px 0 2px">
          <strong>${esc(r.eventName)}</strong>
          <p style="margin:4px 0">${esc(fmt(r.start))}</p>
          <div class="row"><span>Attendance</span><strong>${Number(r.attendanceMinutes||0)} min</strong></div>
          <div class="row"><span>Status</span><strong class="${r.inVoice?'ok':r.verified?'warn':''}">${r.inVoice?'IN VOICE ✓':r.verified?'STAMP READY':'REGISTERED'}</strong></div>
        </div>`).join('')}
      </div>`;
  }

  showPilots=function(rows){
    const pilots=groupPilots(rows);
    content.innerHTML=`
      <div class="card" style="padding:14px;margin-top:0">
        <div class="eyebrow">Pilot Lookup</div>
        <h3 style="margin:5px 0 4px">Check a pilot's current status</h3>
        <p style="margin:0 0 10px;color:var(--muted);font-size:11px">Search by Discord display name or Discord user ID.</p>
        <button id="showCurrentRegistrations" class="full" style="margin:0 0 10px">SHOW CURRENTLY REGISTERED PILOTS</button>
        <input id="pilotSearch" class="search" placeholder="Enter pilot name or Discord ID…" autocomplete="off" style="margin-bottom:0">
      </div>
      <div id="pilotRows"><div class="empty">Enter a pilot name or Discord ID to look them up, or show current flight registrations.</div></div>`;

    const box=document.getElementById('pilotRows');
    const search=document.getElementById('pilotSearch');
    const currentButton=document.getElementById('showCurrentRegistrations');

    const bindResultActions=()=>{
      box.querySelectorAll('[data-history]').forEach((b)=>b.addEventListener('click',()=>{
        const panel=document.getElementById(b.dataset.history);
        const open=panel.style.display!=='none';
        panel.style.display=open?'none':'block';
        b.textContent=open?'View flight history':'Hide flight history';
      }));
      box.querySelectorAll('[data-adjust]').forEach((b)=>b.addEventListener('click',()=>adjust(b.dataset.user,b.dataset.event)));
      box.querySelectorAll('[data-stamp]').forEach((b)=>b.addEventListener('click',()=>stamp(b.dataset.user,b.dataset.event,b.dataset.action)));
    };

    const render=()=>{
      const q=search.value.trim().toLowerCase();
      if(!q){
        box.innerHTML='<div class="empty">Enter a pilot name or Discord ID to look them up, or show current flight registrations.</div>';
        return;
      }
      const filtered=pilots.filter((p)=>`${p.username} ${p.userId}`.toLowerCase().includes(q));
      if(!filtered.length){
        box.innerHTML='<div class="empty">No current record found for that pilot.</div>';
        return;
      }
      box.innerHTML=filtered.map(renderPilotCard).join('');
      bindResultActions();
    };

    currentButton.addEventListener('click',async()=>{
      currentButton.disabled=true;
      currentButton.textContent='LOADING CURRENT REGISTRATIONS…';
      search.value='';
      try{
        const events=await api('/api/admin/events');
        const ids=new Set(events.map(e=>String(e.id||e.eventId||'')).filter(Boolean));
        const names=new Set(events.map(e=>String(e.name||'')).filter(Boolean));
        const currentRows=rows.filter(r=>ids.has(String(r.eventId))||names.has(String(r.eventName||'')));
        const currentPilots=groupPilots(currentRows);
        box.innerHTML=currentPilots.length
          ? `<div class="card" style="padding:10px 14px"><div class="row"><span>Currently registered pilots</span><strong class="ok">${currentPilots.length}</strong></div></div>${currentPilots.map(currentRegistrationCard).join('')}`
          : '<div class="empty">No pilots are currently registered for upcoming flights.</div>';
      }catch(e){
        box.innerHTML=`<div class="card bad">${esc(e.message)}</div>`;
      }finally{
        currentButton.disabled=false;
        currentButton.textContent='SHOW CURRENTLY REGISTERED PILOTS';
      }
    });

    search.addEventListener('input',render);
    setTimeout(()=>search.focus(),50);
  };
})();
