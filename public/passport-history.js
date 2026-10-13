(()=>{
  window.passportHistoryEvents = window.passportHistoryEvents || [];

  function mergeHistory(data){
    if(!Array.isArray(data?.history) || typeof statuses!=='object' || !statuses)return;
    const events=[];
    for(const item of data.history){
      const e=item?.event, s=item?.status;
      if(!e?.id || !s)continue;
      const existing=statuses[e.id]||{};
      statuses[e.id]={...s,...existing,claimed:!!(s.claimed||existing.claimed),verified:!!(s.verified||existing.verified),attendanceMinutes:Math.max(Number(s.attendanceMinutes||0),Number(existing.attendanceMinutes||0)),registered:true};
      if(!String(e.id).startsWith('flying-now:'))events.push(e);
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
