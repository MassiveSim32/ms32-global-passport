(()=>{
  window.passportHistoryEvents = window.passportHistoryEvents || [];

  function mergeHistory(data){
    if(!Array.isArray(data?.history) || typeof statuses!=='object' || !statuses)return;
    const events=[];
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
      // Flying Now bonus stamps are real Passport stamps once verified, so keep
      // them in the same history collection as scheduled community flights.
      if(claimed)events.push(e);
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
