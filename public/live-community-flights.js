(()=>{
  const page=document.getElementById('flights');
  if(!page||document.getElementById('ms32LiveFlights'))return;
  const style=document.createElement('style');
  style.textContent=`
    .ms32-live-board{margin:0 0 22px;padding:16px;border:1px solid #28506a;border-radius:20px;background:linear-gradient(135deg,#10283c,#081521)}
    .ms32-live-board h2{margin:4px 0 12px;font-size:19px;color:#fff}
    .ms32-live-statuses{display:flex;flex-wrap:wrap;gap:9px}
    .ms32-live-status{display:inline-flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid #36566e;border-radius:11px;background:#0b1e2d;color:#b3c5d5;font-size:12px;font-weight:800}
    .ms32-live-status .ms32-status-dot{width:8px;height:8px;border-radius:50%;background:#7790a1;flex:none}
    .ms32-live-status.is-active{border-color:#267a50;color:#82e8b1;background:#113323}
    .ms32-live-status.is-active .ms32-status-dot{background:#42e28b;box-shadow:0 0 9px #42e28b88}
    .ms32-live-none{display:inline-flex;align-items:center;gap:7px;margin-top:10px;padding:9px 12px;border:1px solid #8d3a43;border-radius:11px;background:#56232b;color:#ffb7bc;font-size:12px;font-weight:800}
    .ms32-live-none[hidden]{display:none}
    .ms32-live-roster{margin-top:12px;display:grid;gap:7px}
    .ms32-live-roster[hidden]{display:none}
    .ms32-live-entry{padding:9px 11px;border:1px solid #284a5c;border-radius:11px;background:#0b1e2d}
    .ms32-live-entry-top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:5px;color:#f4f8fb;font-size:12px;font-weight:800}
    .ms32-live-entry-route{color:#b4cede;font-size:11px;margin-top:4px;line-height:1.45}
    .ms32-live-entry-access{font-size:10px;font-weight:800;color:#82e8b1}
    .ms32-live-entry-access.solo{color:#ffb0a8}
  `;
  document.head.appendChild(style);
  const board=document.createElement('section');
  board.id='ms32LiveFlights';
  board.className='ms32-live-board';
  board.innerHTML='<div class="eyebrow">Community activity</div><h2>Active Flights</h2><div class="ms32-live-statuses"><span class="ms32-live-status" id="ms32CommunityIndicator"><span class="ms32-status-dot"></span><span>Community Flights · Checking…</span></span><span class="ms32-live-status" id="ms32SpontaneousIndicator"><span class="ms32-status-dot"></span><span>Spontaneous Flights · Checking…</span></span></div><span class="ms32-live-none" id="ms32NoActiveFlights" hidden>● No Active Flights</span><div class="ms32-live-roster" id="ms32SpontaneousRoster" hidden></div>';
  page.insertBefore(board,page.firstChild);
  const community=board.querySelector('#ms32CommunityIndicator');
  const spontaneous=board.querySelector('#ms32SpontaneousIndicator');
  const none=board.querySelector('#ms32NoActiveFlights');
  const roster=board.querySelector('#ms32SpontaneousRoster');
  const radioNames={
    '1560271519387615262':'Free Flight Radio 1',
    '1560271563901771836':'Free Flight Radio 2',
    '1560271637796884530':'Free Flight Radio 3',
    '1560271866122211408':'Solo Flight Radio 1',
    '1560271759792410696':'Solo Flight Radio 2',
    '1560271715261747290':'Solo Flight Radio 3'
  };
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let spontaneousFlights=[];
  let communityActive=null,spontaneousActive=null,loading=false;
  function indicator(el,label,active){
    el.classList.toggle('is-active',active===true);
    el.querySelector('span:last-child').textContent=label+' · '+(active===true?'ACTIVE':active===false?'Inactive':'Checking…');
  }
  function render(){
    indicator(community,'Community Flights',communityActive);
    indicator(spontaneous,'Spontaneous Flights',spontaneousActive);
    none.hidden=communityActive!==false||spontaneousActive!==false;
    roster.hidden=!spontaneousFlights.length;
    roster.innerHTML=spontaneousFlights.map(f=>{
      const solo=String(f.joinPolicy||'open').toLowerCase()==='solo';
      const radio=radioNames[String(f.channelId||'')]||'Radio channel unavailable';
      const pilot=escape(f.pilot||'MS32 Pilot');
      const departure=escape(f.departure||'—');
      const destination=escape(f.destination||'—');
      return '<div class="ms32-live-entry"><div class="ms32-live-entry-top"><span>✈ '+pilot+'</span><span class="ms32-live-entry-access '+(solo?'solo':'')+'">'+(solo?'🔒 Solo':'🟢 Free to join')+'</span></div><div class="ms32-live-entry-route">'+departure+' → '+destination+' · '+escape(radio)+'</div></div>';
    }).join('');
  }
  async function refresh(){
    if(document.hidden||loading)return;
    loading=true;
    try{
      const results=await Promise.allSettled([
        fetch('/api/events/activity',{credentials:'same-origin',cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('community unavailable');return r.json()}),
        fetch('/api/community/live-flights',{credentials:'same-origin',cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('spontaneous unavailable');return r.json()})
      ]);
      const activity=results[0].status==='fulfilled'?results[0].value:null;
      communityActive=typeof activity?.communityActive==='boolean'?activity.communityActive:null;
      const data=results[1].status==='fulfilled'?results[1].value:null;
      spontaneousFlights=Array.isArray(data?.flights)?data.flights:[];
      spontaneousActive=Array.isArray(data?.flights)?spontaneousFlights.length>0:null;
      render();
    }finally{loading=false}
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  refresh();
  setInterval(refresh,15000);
})();