(()=>{
  const page=document.getElementById('flights');
  if(!page || document.getElementById('ms32LiveFlights'))return;
  const style=document.createElement('style');
  style.textContent=`
    .ms32-live-board{margin:0 0 22px;padding:16px;border:1px solid #28506a;border-radius:20px;background:linear-gradient(135deg,#10283c,#081521)}
    .ms32-live-board h2{margin:4px 0 7px;font-size:19px;color:#fff}
    .ms32-live-board .ms32-live-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
    .ms32-live-board .ms32-live-count{color:#7be3ac;font-size:10px;font-weight:800;letter-spacing:.05em}
    .ms32-live-board .ms32-live-list{display:grid;gap:9px}
    .ms32-live-flight{padding:12px;border-radius:13px;border:1px solid #284a5c;background:#0b1e2d}
    .ms32-live-flight b{color:#f4f8fb;font-size:13px}
    .ms32-live-flight .ms32-live-route{margin:7px 0;color:#ffc36d;font-size:13px;font-weight:800}
    .ms32-live-flight .ms32-live-detail{color:#b1c6d6;font-size:11px;line-height:1.5}
    .ms32-live-flight .ms32-live-tag{color:#82e8b1;font-size:10px;font-weight:800}
    .ms32-live-flight .ms32-access{display:inline-block;margin-top:7px;padding:5px 8px;border-radius:999px;font-size:9px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}
    .ms32-live-flight .ms32-access.open{background:#123727;border:1px solid #285f43;color:#82e8b1}
    .ms32-live-flight .ms32-access.solo{background:#312222;border:1px solid #6a3b3b;color:#ffb0a8}
    .ms32-live-board .ms32-live-empty{padding:13px;border:1px dashed #315066;border-radius:12px;color:#b3c5d5;font-size:12px;line-height:1.5}
    .ms32-live-board .ms32-live-help{font-size:11px;color:#a6bdce;line-height:1.5;margin:10px 0 0}
  `;
  document.head.appendChild(style);
  const board=document.createElement('section');
  board.id='ms32LiveFlights';
  board.className='ms32-live-board';
  board.innerHTML='<div class="ms32-live-head"><div><div class="eyebrow">Community activity</div><h2>Active Community Flights</h2></div><span class="ms32-live-count" id="ms32LiveCount">CHECKING…</span></div><div class="ms32-live-list" id="ms32LiveList"><div class="ms32-live-empty">Checking active flights…</div></div><p class="ms32-live-help">Active spontaneous flights show whether they are open to other pilots or marked solo. Join the selected Radio channel in Discord for open flights. Updates every 15 seconds.</p>';
  page.insertBefore(board,page.firstChild);
  const list=board.querySelector('#ms32LiveList');
  const count=board.querySelector('#ms32LiveCount');
  let flights=[];
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(){
    count.textContent=flights.length+' LIVE';
    list.innerHTML=flights.length?flights.map(f=>{
      const solo=String(f.joinPolicy||'open').toLowerCase()==='solo';
      const access=solo?'🔒 SOLO FLIGHT':'🟢 OPEN TO JOIN';
      return '<article class="ms32-live-flight"><span class="ms32-live-tag">● LIVE · SPONTANEOUS</span><div style="margin-top:5px"><b>'+escape(f.pilot)+'</b></div><div class="ms32-live-route">'+escape(f.departure)+' → '+escape(f.destination)+'</div><div class="ms32-live-detail">Aircraft: '+escape(f.aircraft)+'</div><span class="ms32-access '+(solo?'solo':'open')+'">'+access+'</span></article>';
    }).join(''):'<div class="ms32-live-empty">No spontaneous flights are currently confirmed active. Check back soon or start your own flight from Home.</div>';
  }
  async function refresh(){
    if(document.hidden)return;
    try{
      const response=await fetch('/api/community/live-flights',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)throw Error(response.status===401?'Sign in to see active flights.':'Live flights temporarily unavailable.');
      const data=await response.json();
      flights=Array.isArray(data.flights)?data.flights:[];
      render();
    }catch(e){count.textContent='UNAVAILABLE';list.innerHTML='<div class="ms32-live-empty">'+escape(e.message)+'</div>';}
  }
  refresh();
  setInterval(refresh,15000);
})();