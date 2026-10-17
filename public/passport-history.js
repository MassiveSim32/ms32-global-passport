(()=>{
  window.passportHistoryEvents = window.passportHistoryEvents || [];

  function mergeHistory(data){
    if(!Array.isArray(data?.history) || typeof statuses!=='object' || !statuses)return;
    const events=[];
    const live=Array.isArray(allEvents)?allEvents:[];
    for(const item of data.history){
      const e=item?.event, s=item?.status;
      if(!e?.id || !s)continue;
      const existing=statuses[e.id]||{};
      const verified=!!(s.verified||existing.verified);
      // A visible Passport stamp must be both claimed and verified. This keeps
      // legacy/inconsistent rows from appearing as issued stamps in one surface
      // while being absent from another.
      const claimed=!!((s.claimed||existing.claimed)&&verified);
      statuses[e.id]={...s,...existing,claimed,verified,attendanceMinutes:Math.max(Number(s.attendanceMinutes||0),Number(existing.attendanceMinutes||0)),registered:true};
      // Use the current Discord event metadata when this event is still present
      // in the live event list. Event names/routes can be corrected after pilots
      // registered, while the persisted history row may still contain the older
      // title. Historical events that are no longer live continue using DB data.
      const current=live.find(x=>String(x?.id||'')===String(e.id));
      if(claimed)events.push(current||e);
    }
    window.passportHistoryEvents=events;
    try{if(typeof updateDashboard==='function')updateDashboard()}catch{}
    try{if(typeof renderStampBook==='function')renderStampBook()}catch{}
  }

  async function loadHistory(){
    try{
      const r=await fetch('/api/passport/history',{credentials:'same-origin',cache:'no-store'});
      if(!r.ok)return;
      mergeHistory(await r.json());
    }catch{}
  }

  setTimeout(loadHistory,700);
  setInterval(loadHistory,15000);
})();
