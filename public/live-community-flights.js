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
  `;
  document.head.appendChild(style);
  const board=document.createElement('section');
  board.id='ms32LiveFlights';
  board.className='ms32-live-board';
  board.innerHTML='<div class="eyebrow">Community activity</div><h2>Active Flights</h2><div class="ms32-live-statuses"><span class="ms32-live-status" id="ms32CommunityIndicator"><span class="ms32-status-dot"></span><span>Community Flights · Checking…</span></span><span class="ms32-live-status" id="ms32SpontaneousIndicator"><span class="ms32-status-dot"></span><span>Spontaneous Flights · Checking…</span></span></div><span class="ms32-live-none" id="ms32NoActiveFlights" hidden>● No Active Flights</span>';
  page.insertBefore(board,page.firstChild);
  const community=board.querySelector('#ms32CommunityIndicator');
  const spontaneous=board.querySelector('#ms32SpontaneousIndicator');
  const none=board.querySelector('#ms32NoActiveFlights');
  let communityActive=null,spontaneousActive=null,loading=false;
  function indicator(el,label,active){
    el.classList.toggle('is-active',active===true);
    el.querySelector('span:last-child').textContent=label+' · '+(active===true?'ACTIVE':active===false?'Inactive':'Checking…');
  }
  function render(){
    indicator(community,'Community Flights',communityActive);
    indicator(spontaneous,'Spontaneous Flights',spontaneousActive);
    none.hidden=communityActive!==false||spontaneousActive!==false;
  }
  function scheduledInProgress(event,now){
    // Discord status 2 indicates an event has been started. Exclude completed/cancelled
    // events and spontaneous Flying Now records from the scheduled-flight indicator.
    if(!event||String(event.id||'').startsWith('flying-now:'))return false;
    const start=Date.parse(event.start||'');
    const end=Date.parse(event.end||'');
    if(!Number.isFinite(start)||now<start)return false;
    if(Number.isFinite(end)&&now>=end)return false;
    return Number(event.status)===2;
  }
  async function refresh(){
    if(document.hidden||loading)return;
    loading=true;
    try{
      const results=await Promise.allSettled([
        fetch('/api/events',{credentials:'same-origin',cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('community unavailable');return r.json()}),
        fetch('/api/community/live-flights',{credentials:'same-origin',cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('spontaneous unavailable');return r.json()})
      ]);
      if(results[0].status==='fulfilled'&&Array.isArray(results[0].value)){
        communityActive=results[0].value.some(e=>scheduledInProgress(e,Date.now()));
      }else communityActive=null;
      const data=results[1].status==='fulfilled'?results[1].value:null;
      spontaneousActive=Array.isArray(data?.flights)?data.flights.length>0:null;
      render();
    }finally{loading=false}
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  refresh();
  setInterval(refresh,15000);
})();