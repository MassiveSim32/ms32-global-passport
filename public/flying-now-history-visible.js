(()=>{
  const style=document.createElement('style');
  style.textContent=`
    .flying-now-history{margin-top:14px;padding-top:12px;border-top:1px solid rgba(92,84,72,.28)}
    .flying-now-history-head{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-bottom:8px}
    .flying-now-history-head h3{margin:0;font-size:14px;color:#4f493f}
    .flying-now-history-head span{font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#7c7467}
    .flying-now-history-list{display:grid;gap:8px}
    .flying-now-history-row{border:1px solid #b8ad98;background:#f7f0de;border-radius:12px;padding:10px 11px;color:#4f493f}
    .flying-now-history-row strong{display:block;font-size:11px;line-height:1.35}
    .flying-now-history-meta{margin-top:4px;font-size:9px;line-height:1.45;color:#756c5e}
    .flying-now-history-state{display:inline-block;margin-top:6px;padding:4px 7px;border-radius:999px;font-size:7px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;border:1px solid #b9aa8d;color:#725f3b;background:#efe3c9}
    .flying-now-history-state.ok{border-color:#6d9a74;color:#426b49;background:#e1f0df}
    .flying-now-history-state.ready{border-color:#8d7b48;color:#725f22;background:#f3e9bf}
  `;
  document.head.appendChild(style);

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=d=>{
    try{return new Date(d).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}catch{return ''}
  };

  function ensureHost(){
    const stampBook=document.getElementById('stampBook');
    if(!stampBook)return null;
    let host=document.getElementById('flyingNowHistory');
    if(host)return host;
    host=document.createElement('section');
    host.id='flyingNowHistory';
    host.className='flying-now-history';
    stampBook.insertAdjacentElement('afterend',host);
    return host;
  }

  function render(items){
    const host=ensureHost();
    if(!host)return;
    const rows=(Array.isArray(items)?items:[])
      .filter(x=>String(x?.event?.id||'').startsWith('flying-now:')&&Number(x?.status?.attendanceMinutes||0)>0)
      .sort((a,b)=>new Date(b?.event?.start||0)-new Date(a?.event?.start||0));
    if(!rows.length){host.innerHTML='';host.hidden=true;return;}
    host.hidden=false;
    host.innerHTML=`<div class="flying-now-history-head"><h3>Flying Now history</h3><span>All recorded flights</span></div><div class="flying-now-history-list">${rows.map(item=>{
      const e=item.event||{}, s=item.status||{};
      const mins=Number(s.attendanceMinutes||0);
      const qualified=!!s.verified;
      const claimed=qualified&&!!s.claimed;
      const state=claimed?'STAMP AWARDED':qualified?'QUALIFIED · STAMP READY':`RECORDED · ${mins}/30 MIN · NO STAMP`;
      const cls=claimed?'ok':qualified?'ready':'';
      return `<article class="flying-now-history-row"><strong>${esc(e.name||'Flying Now')}</strong><div class="flying-now-history-meta">${esc(fmt(e.start))} · ${mins} min recorded attendance</div><span class="flying-now-history-state ${cls}">${esc(state)}</span></article>`;
    }).join('')}</div>`;
  }

  async function load(){
    try{
      const r=await fetch('/api/passport/history',{credentials:'same-origin',cache:'no-store'});
      if(!r.ok)return;
      const d=await r.json();
      render(d?.history||[]);
    }catch{}
  }

  setTimeout(load,1000);
  setInterval(load,15000);
})();
